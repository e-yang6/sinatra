"""
Sinatra Backend — FastAPI server for vocal-to-instrument pipeline.

Run with:
    cd backend
    uvicorn main:app --reload --port 8000
"""

import os
import sys

# Ensure the backend directory is on the path so local imports work
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from services.bpm import detect_bpm
from services.transcription import vocal_to_midi
from services.synth import render_midi_to_wav
from utils.file_helpers import save_upload, validate_wav, cleanup_file, UPLOAD_DIR

app = FastAPI(title="Sinatra", version="0.1.0")

# Allow the frontend (Vite dev server) to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- In-memory state for the current session -----
# For a hackathon demo, we just track the latest files.
session = {
    "drum_path": None,
    "drum_bpm": None,
    "vocal_path": None,
    "midi_path": None,
    "rendered_path": None,
}


# ==================== ENDPOINTS ====================


@app.post("/upload-drum")
async def upload_drum(file: UploadFile = File(...)):
    """
    Upload a drum loop WAV.
    Detects BPM and returns it.
    """
    if not file.filename.lower().endswith(".wav"):
        raise HTTPException(status_code=400, detail="Only WAV files are accepted.")

    file_path = await save_upload(file)

    if not validate_wav(file_path):
        cleanup_file(file_path)
        raise HTTPException(status_code=400, detail="Invalid WAV file.")

    try:
        bpm = detect_bpm(file_path)
    except Exception as e:
        cleanup_file(file_path)
        raise HTTPException(status_code=500, detail=f"BPM detection failed: {e}")

    # Store in session
    session["drum_path"] = file_path
    session["drum_bpm"] = bpm

    return {"status": "ok", "bpm": bpm, "filename": os.path.basename(file_path)}


@app.post("/upload-vocal")
async def upload_vocal(file: UploadFile = File(...)):
    """
    Upload a vocal WAV recording.
    Converts it to MIDI using Basic Pitch.
    Returns the MIDI filename.
    """
    if not file.filename.lower().endswith(".wav"):
        raise HTTPException(status_code=400, detail="Only WAV files are accepted.")

    file_path = await save_upload(file)

    if not validate_wav(file_path):
        cleanup_file(file_path)
        raise HTTPException(status_code=400, detail="Invalid WAV file.")

    try:
        current_bpm = session.get("drum_bpm") or 120
        midi_path = vocal_to_midi(file_path, bpm=current_bpm)
    except Exception as e:
        cleanup_file(file_path)
        raise HTTPException(status_code=500, detail=f"MIDI transcription failed: {e}")

    # Store in session
    session["vocal_path"] = file_path
    session["midi_path"] = midi_path

    return {
        "status": "ok",
        "midi_filename": os.path.basename(midi_path),
    }


@app.post("/render")
async def render(instrument: str = Form(default="Piano")):
    """
    Render the most recent MIDI file to a WAV using FluidSynth.
    Returns the WAV file for playback.
    """
    midi_path = session.get("midi_path")
    if not midi_path or not os.path.exists(midi_path):
        raise HTTPException(
            status_code=400,
            detail="No MIDI file available. Upload a vocal first.",
        )

    try:
        wav_path = render_midi_to_wav(midi_path, instrument=instrument)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rendering failed: {e}")

    session["rendered_path"] = wav_path

    return FileResponse(
        wav_path,
        media_type="audio/wav",
        filename="sinatra_output.wav",
    )


@app.post("/process-all")
async def process_all(
    vocal: UploadFile = File(...),
    drum: UploadFile = File(None),
    instrument: str = Form(default="Piano"),
):
    """
    Full pipeline in one request:
    1. (Optional) Upload drum loop → detect BPM
    2. Upload vocal → convert to MIDI
    3. Render MIDI → WAV with chosen instrument
    4. Return the rendered WAV
    """
    bpm = None

    # --- Step 1: Drum BPM (optional) ---
    if drum is not None:
        if not drum.filename.lower().endswith(".wav"):
            raise HTTPException(status_code=400, detail="Drum file must be WAV.")
        drum_path = await save_upload(drum)
        if not validate_wav(drum_path):
            cleanup_file(drum_path)
            raise HTTPException(status_code=400, detail="Invalid drum WAV file.")
        try:
            bpm = detect_bpm(drum_path)
        except Exception as e:
            cleanup_file(drum_path)
            raise HTTPException(status_code=500, detail=f"BPM detection failed: {e}")
        session["drum_path"] = drum_path
        session["drum_bpm"] = bpm

    # --- Step 2: Vocal → MIDI ---
    if not vocal.filename.lower().endswith(".wav"):
        raise HTTPException(status_code=400, detail="Vocal file must be WAV.")
    vocal_path = await save_upload(vocal)
    if not validate_wav(vocal_path):
        cleanup_file(vocal_path)
        raise HTTPException(status_code=400, detail="Invalid vocal WAV file.")

    try:
        current_bpm = bpm or session.get("drum_bpm") or 120
        midi_path = vocal_to_midi(vocal_path, bpm=current_bpm)
    except Exception as e:
        cleanup_file(vocal_path)
        raise HTTPException(status_code=500, detail=f"MIDI transcription failed: {e}")

    session["vocal_path"] = vocal_path
    session["midi_path"] = midi_path

    # --- Step 3: Render MIDI → WAV ---
    try:
        wav_path = render_midi_to_wav(midi_path, instrument=instrument)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rendering failed: {e}")

    session["rendered_path"] = wav_path

    # Build response headers with BPM info if available
    headers = {}
    if bpm is not None:
        headers["X-Detected-BPM"] = str(bpm)

    return FileResponse(
        wav_path,
        media_type="audio/wav",
        filename="sinatra_output.wav",
        headers=headers,
    )


@app.get("/health")
async def health():
    """Simple health check."""
    return {"status": "ok", "session": {k: v is not None for k, v in session.items()}}


@app.get("/download-midi")
async def download_midi():
    """Download the latest generated MIDI file."""
    midi_path = session.get("midi_path")
    if not midi_path or not os.path.exists(midi_path):
        raise HTTPException(status_code=404, detail="No MIDI file available.")
    return FileResponse(
        midi_path,
        media_type="audio/midi",
        filename="sinatra_vocal.mid",
    )
