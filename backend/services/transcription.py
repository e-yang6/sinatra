"""
Vocal-to-MIDI transcription using Spotify's Basic Pitch (ONNX backend).

Basic Pitch is an ML model that detects pitch, onset, and notes from audio.
It handles polyphonic audio and is far more accurate than pYIN for melodies.
We run it via ONNX Runtime (no TensorFlow needed).
"""

import os
import warnings

# Suppress noisy warnings from basic-pitch about missing optional backends
warnings.filterwarnings("ignore", message=".*Coremltools is not installed.*")
warnings.filterwarnings("ignore", message=".*tflite-runtime is not installed.*")
warnings.filterwarnings("ignore", message=".*Tensorflow is not installed.*")
warnings.filterwarnings("ignore", message=".*pkg_resources is deprecated.*")

from basic_pitch.inference import predict
from basic_pitch import ICASSP_2022_MODEL_PATH

from utils.file_helpers import generate_filepath

# ---- Tuning knobs ----
ONSET_THRESHOLD = 0.6       # Higher = only strong note onsets (was 0.5)
FRAME_THRESHOLD = 0.45      # Higher = only confident frames count (was 0.3)
MIN_NOTE_LENGTH_MS = 127.7  # Ignore notes shorter than ~128ms (one 32nd note at 120bpm)
MIN_FREQ_HZ = 80.0          # ~E2 — ignore low rumble/noise
MAX_FREQ_HZ = 1500.0        # ~G6 — typical vocal range ceiling

# ---- Post-processing ----
MIN_NOTE_DURATION_SEC = 0.1     # Drop notes shorter than 100ms after detection
MIN_VELOCITY = 40               # Drop very quiet notes
MERGE_GAP_SEC = 0.06            # Merge same-pitch notes separated by < 60ms
MAX_NOTES_PER_SECOND = 8        # Cap to prevent machine-gun note spam


def vocal_to_midi(wav_path: str, bpm: float = 120.0) -> str:
    """
    Convert a vocal WAV recording to MIDI using Spotify's Basic Pitch.
    Post-processes to remove noise, merge stutters, and snap to clean notes.
    """
    print("=" * 60)
    print("🎵 USING SPOTIFY BASIC PITCH (ML MODEL) 🎵")
    print(f"📁 Transcribing: {os.path.basename(wav_path)}")
    print(f"🎚️  BPM: {bpm}")
    print(f"🤖 Model: {ICASSP_2022_MODEL_PATH}")
    print("=" * 60)

    # Run Basic Pitch inference (uses ONNX model automatically)
    model_output, midi_data, note_events = predict(
        audio_path=wav_path,
        model_or_model_path=ICASSP_2022_MODEL_PATH,
        onset_threshold=ONSET_THRESHOLD,
        frame_threshold=FRAME_THRESHOLD,
        minimum_note_length=MIN_NOTE_LENGTH_MS,
        minimum_frequency=MIN_FREQ_HZ,
        maximum_frequency=MAX_FREQ_HZ,
        melodia_trick=True,
        midi_tempo=bpm,
    )

    raw_notes = sum(len(inst.notes) for inst in midi_data.instruments)
    print(f"   Raw notes from Basic Pitch: {raw_notes}")

    # ---- Post-processing for each instrument ----
    for inst in midi_data.instruments:
        # 1. Strip pitch bends — snap to exact semitones
        inst.pitch_bends = []

        # 2. Round pitches to nearest MIDI note
        for note in inst.notes:
            note.pitch = int(round(max(0, min(127, note.pitch))))

        # 3. Drop short notes and quiet notes
        inst.notes = [
            n for n in inst.notes
            if (n.end - n.start) >= MIN_NOTE_DURATION_SEC
            and n.velocity >= MIN_VELOCITY
        ]

        # 4. Sort by start time
        inst.notes.sort(key=lambda n: n.start)

        # 5. Merge consecutive same-pitch notes with tiny gaps
        merged = []
        for note in inst.notes:
            if (
                merged
                and note.pitch == merged[-1].pitch
                and (note.start - merged[-1].end) < MERGE_GAP_SEC
            ):
                # Extend the previous note
                merged[-1].end = max(merged[-1].end, note.end)
                merged[-1].velocity = max(merged[-1].velocity, note.velocity)
            else:
                merged.append(note)
        inst.notes = merged

        # 6. Limit note density — if too many notes in a short window, keep the loudest
        if inst.notes:
            duration = inst.notes[-1].end - inst.notes[0].start
            if duration > 0:
                notes_per_sec = len(inst.notes) / duration
                if notes_per_sec > MAX_NOTES_PER_SECOND:
                    # Bucket into 0.25s windows, keep top notes per window
                    max_per_window = max(2, int(MAX_NOTES_PER_SECOND * 0.25))
                    filtered = []
                    window_start = inst.notes[0].start
                    window_notes = []

                    for note in inst.notes:
                        if note.start >= window_start + 0.25:
                            # Flush window: keep loudest notes
                            window_notes.sort(key=lambda n: n.velocity, reverse=True)
                            filtered.extend(window_notes[:max_per_window])
                            window_start = note.start
                            window_notes = [note]
                        else:
                            window_notes.append(note)

                    # Flush last window
                    window_notes.sort(key=lambda n: n.velocity, reverse=True)
                    filtered.extend(window_notes[:max_per_window])

                    filtered.sort(key=lambda n: n.start)
                    inst.notes = filtered

    final_notes = sum(len(inst.notes) for inst in midi_data.instruments)
    print(f"✅ After cleanup: {final_notes} notes (removed {raw_notes - final_notes} noisy notes)")

    midi_path = generate_filepath("mid")
    midi_data.write(midi_path)

    print(f"💾 MIDI saved: {os.path.basename(midi_path)}")
    print("=" * 60)

    return midi_path
