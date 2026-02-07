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

# Load .env file BEFORE any service imports so env vars are available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from services.bpm import detect_bpm
from services.transcription import vocal_to_midi
from services.synth import render_midi_to_wav
from services.chat import chat as gemini_chat, clear_history as clear_chat_history
from services.sampler import detect_base_pitch, render_with_sample
from services.chords import generate_chord_progression
from utils.file_helpers import save_upload, validate_wav, cleanup_file, UPLOAD_DIR

# Verify Basic Pitch is available at startup
try:
    from basic_pitch import ICASSP_2022_MODEL_PATH
    from basic_pitch.inference import predict
    print("=" * 60)
    print("✅ Basic Pitch (ML Model) LOADED SUCCESSFULLY")
    print(f"📦 Model path: {ICASSP_2022_MODEL_PATH}")
    print("🎵 Using Spotify Basic Pitch for audio-to-MIDI transcription")
    print("=" * 60)
except ImportError as e:
    print("=" * 60)
    print("❌ ERROR: Basic Pitch not found!")
    print(f"   {e}")
    print("   Run: pip install basic-pitch==0.4.0 --no-deps")
    print("=" * 60)

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
    "sample_path": None,
    "sample_base_pitch": None,
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


@app.post("/upload-sample")
async def upload_sample(file: UploadFile = File(...)):
    """
    Upload a one-shot audio sample (WAV).
    Detects the sample's base pitch and stores it for use as a custom instrument.
    """
    if not file.filename.lower().endswith(".wav"):
        raise HTTPException(status_code=400, detail="Only WAV files are accepted.")

    file_path = await save_upload(file)

    if not validate_wav(file_path):
        cleanup_file(file_path)
        raise HTTPException(status_code=400, detail="Invalid WAV file.")

    try:
        base_pitch = detect_base_pitch(file_path)
    except Exception as e:
        cleanup_file(file_path)
        raise HTTPException(status_code=500, detail=f"Pitch detection failed: {e}")

    session["sample_path"] = file_path
    session["sample_base_pitch"] = base_pitch

    import librosa as _lr
    note_name = _lr.midi_to_note(round(base_pitch))

    return {
        "status": "ok",
        "filename": os.path.basename(file_path),
        "base_pitch": base_pitch,
        "note_name": note_name,
    }


@app.post("/upload-vocal")
async def upload_vocal(
    file: UploadFile = File(...),
    raw_audio: bool = Form(default=False),
    key: str = Form(default="C"),
    scale: str = Form(default="chromatic"),
    quantize: str = Form(default="off"),
):
    """
    Upload a vocal WAV recording.
    If raw_audio=True, just stores the file (no MIDI conversion).
    Otherwise, converts it to MIDI with optional key/scale snapping and quantization.
    """
    if not file.filename.lower().endswith(".wav"):
        raise HTTPException(status_code=400, detail="Only WAV files are accepted.")

    file_path = await save_upload(file)

    if not validate_wav(file_path):
        cleanup_file(file_path)
        raise HTTPException(status_code=400, detail="Invalid WAV file.")

    # Store in session
    session["vocal_path"] = file_path

    if raw_audio:
        # Raw audio mode: just store the file, no MIDI conversion
        session["midi_path"] = None
        return {
            "status": "ok",
            "midi_filename": None,
            "raw_audio": True,
        }
    else:
        # Convert to MIDI with key/scale/quantize
        try:
            current_bpm = session.get("drum_bpm") or 120
            midi_path = vocal_to_midi(
                file_path,
                bpm=current_bpm,
                key=key,
                scale=scale,
                quantize=quantize,
            )
        except Exception as e:
            cleanup_file(file_path)
            raise HTTPException(status_code=500, detail=f"MIDI transcription failed: {e}")

        session["midi_path"] = midi_path
        return {
            "status": "ok",
            "midi_filename": os.path.basename(midi_path),
            "raw_audio": False,
        }


@app.post("/render")
async def render(instrument: str = Form(default="Piano")):
    """
    Render the most recent MIDI file to a WAV using FluidSynth.
    If raw_audio mode was used, just returns the original WAV file.
    Returns the WAV file for playback.
    """
    # Check if we're in raw audio mode (no MIDI conversion)
    vocal_path = session.get("vocal_path")
    midi_path = session.get("midi_path")
    
    if midi_path is None and vocal_path and os.path.exists(vocal_path):
        # Raw audio mode: return the original file
        session["rendered_path"] = vocal_path
        return FileResponse(
            vocal_path,
            media_type="audio/wav",
            filename="sinatra_raw_audio.wav",
        )
    
    # MIDI mode: render MIDI to WAV
    if not midi_path or not os.path.exists(midi_path):
        raise HTTPException(
            status_code=400,
            detail="No MIDI file available. Upload a vocal first.",
        )

    try:
        if instrument == "Custom Sample":
            # Use the uploaded one-shot sample as the instrument
            sample_path = session.get("sample_path")
            if not sample_path or not os.path.exists(sample_path):
                raise HTTPException(
                    status_code=400,
                    detail="No sample uploaded. Upload a one-shot sample first.",
                )
            wav_path = render_with_sample(
                midi_path,
                sample_path,
                base_pitch=session.get("sample_base_pitch"),
            )
        else:
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


# ==================== CHORD GENERATION ====================


class ChordRequest(BaseModel):
    chords: list[str]             # e.g. ["C", "Am", "F", "G7"]
    bpm: float = 120.0
    beats_per_chord: int = 4
    instrument: str = "Piano"
    octave_shift: int = 0         # -2 to +2
    velocity: int = 80            # 1-127
    pattern: str = "block"        # "block" or "arpeggiated"


@app.post("/generate-chords")
async def generate_chords_endpoint(request: ChordRequest):
    """
    Generate a chord progression as rendered audio.
    Returns the WAV file directly.
    """
    if not request.chords:
        raise HTTPException(status_code=400, detail="No chords provided.")

    # Validate
    if request.bpm < 40 or request.bpm > 300:
        raise HTTPException(status_code=400, detail="BPM must be between 40 and 300.")
    if request.beats_per_chord < 1 or request.beats_per_chord > 16:
        raise HTTPException(status_code=400, detail="beats_per_chord must be between 1 and 16.")
    if len(request.chords) > 64:
        raise HTTPException(status_code=400, detail="Maximum 64 chords per progression.")

    try:
        wav_path = generate_chord_progression(
            chords=request.chords,
            bpm=request.bpm,
            beats_per_chord=request.beats_per_chord,
            instrument=request.instrument,
            octave_shift=request.octave_shift,
            velocity=request.velocity,
            pattern=request.pattern,
        )
        return FileResponse(
            wav_path,
            media_type="audio/wav",
            filename="sinatra_chords.wav",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CHAT ENDPOINTS ====================


class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Send a text message to Frank (AI assistant).
    Includes project context for relevant suggestions.
    Returns the AI response and any detected actions.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    
    result = gemini_chat(request.message, request.context)
    return result


@app.post("/chat/clear")
async def chat_clear_endpoint():
    """Clear the chat conversation history."""
    clear_chat_history()
    return {"status": "ok", "message": "Chat history cleared."}
