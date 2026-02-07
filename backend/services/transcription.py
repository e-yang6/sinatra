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

# ---- Scale definitions (pitch classes 0-11, where 0=C, 1=C#, ..., 11=B) ----
SCALE_INTERVALS = {
    "major":     [0, 2, 4, 5, 7, 9, 11],
    "minor":     [0, 2, 3, 5, 7, 8, 10],
    "chromatic": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
}

# Map note names to pitch class offsets
KEY_OFFSETS = {
    "C": 0, "C#": 1, "Db": 1,
    "D": 2, "D#": 3, "Eb": 3,
    "E": 4,
    "F": 5, "F#": 6, "Gb": 6,
    "G": 7, "G#": 8, "Ab": 8,
    "A": 9, "A#": 10, "Bb": 10,
    "B": 11,
}


def _build_scale_set(key: str, scale: str) -> set[int]:
    """Build a set of all valid MIDI note numbers (0-127) for a given key+scale."""
    root = KEY_OFFSETS.get(key, 0)
    intervals = SCALE_INTERVALS.get(scale, SCALE_INTERVALS["chromatic"])
    pitch_classes = set((root + i) % 12 for i in intervals)
    return {midi for midi in range(128) if midi % 12 in pitch_classes}


def _snap_to_scale(pitch: int, valid_notes: set[int]) -> int:
    """Snap a MIDI pitch to the nearest note in the scale."""
    if pitch in valid_notes:
        return pitch
    # Search up and down for the closest valid note
    for offset in range(1, 7):
        if (pitch + offset) in valid_notes:
            return pitch + offset
        if (pitch - offset) in valid_notes:
            return pitch - offset
    return pitch  # Fallback (shouldn't happen with chromatic)


def _quantize_time(t: float, bpm: float, quantize: str) -> float:
    """
    Quantize a time value (seconds) to the nearest grid division.
    quantize: "1/4", "1/8", "1/16", "1/32", or "off"
    """
    if quantize == "off":
        return t

    divisions = {"1/4": 1, "1/8": 2, "1/16": 4, "1/32": 8}
    subdivisions_per_beat = divisions.get(quantize, 1)

    # Duration of one grid cell in seconds
    beat_duration = 60.0 / bpm
    grid_size = beat_duration / subdivisions_per_beat

    # Snap to nearest grid line
    return round(t / grid_size) * grid_size


def vocal_to_midi(
    wav_path: str,
    bpm: float = 120.0,
    key: str = "C",
    scale: str = "chromatic",
    quantize: str = "off",
) -> str:
    """
    Convert a vocal WAV recording to MIDI using Spotify's Basic Pitch.
    Post-processes to remove noise, merge stutters, snap to scale, and quantize.

    Args:
        wav_path:  Path to the input WAV file.
        bpm:       Tempo for the MIDI file and quantization grid.
        key:       Musical key root note (e.g. "C", "F#", "Bb").
        scale:     Scale type: "major", "minor", or "chromatic".
        quantize:  Note quantization: "off", "1/4", "1/8", "1/16", "1/32".
    """
    print("=" * 60)
    print("🎵 USING SPOTIFY BASIC PITCH (ML MODEL) 🎵")
    print(f"📁 Transcribing: {os.path.basename(wav_path)}")
    print(f"🎚️  BPM: {bpm}  |  Key: {key} {scale}  |  Quantize: {quantize}")
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

    # ---- Scale snapping ----
    if scale != "chromatic":
        valid_notes = _build_scale_set(key, scale)
        for inst in midi_data.instruments:
            for note in inst.notes:
                note.pitch = _snap_to_scale(note.pitch, valid_notes)
        print(f"🎼 Snapped notes to {key} {scale}")

    # ---- Time quantization ----
    if quantize != "off":
        for inst in midi_data.instruments:
            for note in inst.notes:
                q_start = _quantize_time(note.start, bpm, quantize)
                q_end = _quantize_time(note.end, bpm, quantize)
                # Ensure note has minimum duration after quantization
                if q_end <= q_start:
                    grid = 60.0 / bpm / {"1/4": 1, "1/8": 2, "1/16": 4, "1/32": 8}.get(quantize, 1)
                    q_end = q_start + grid
                note.start = q_start
                note.end = q_end
        print(f"⏱️  Quantized notes to {quantize} grid")

    final_notes = sum(len(inst.notes) for inst in midi_data.instruments)
    print(f"✅ After cleanup: {final_notes} notes (removed {raw_notes - final_notes} noisy notes)")

    midi_path = generate_filepath("mid")
    midi_data.write(midi_path)

    print(f"💾 MIDI saved: {os.path.basename(midi_path)}")
    print("=" * 60)

    return midi_path
