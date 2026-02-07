"""
Sampler service — pitch-shifts a one-shot WAV sample to play MIDI notes.

Works like a basic sampler:
1. Detect the base pitch of the uploaded one-shot sample.
2. For each MIDI note, pitch-shift the sample by the appropriate semitones.
3. Place each shifted note at the correct time position and mix together.
"""

import os
import numpy as np
import librosa
import soundfile as sf
import pretty_midi

from utils.file_helpers import generate_filepath

SAMPLE_RATE = 44100


def detect_base_pitch(wav_path: str) -> float:
    """
    Detect the fundamental pitch of a one-shot sample.
    Returns the MIDI note number (float) of the detected pitch.
    Falls back to C4 (60) if detection fails.
    """
    y, sr = librosa.load(wav_path, sr=SAMPLE_RATE, mono=True)

    # Use pyin for robust pitch detection
    f0, voiced_flag, voiced_probs = librosa.pyin(
        y,
        fmin=librosa.note_to_hz('C2'),
        fmax=librosa.note_to_hz('C6'),
        sr=sr,
    )

    # Get the median of voiced frames (ignoring NaN/unvoiced)
    voiced_f0 = f0[voiced_flag] if voiced_flag is not None else f0[~np.isnan(f0)]

    if len(voiced_f0) == 0:
        print("[Sampler] ⚠️  Could not detect pitch — defaulting to C4 (MIDI 60)")
        return 60.0

    median_hz = float(np.median(voiced_f0))
    midi_note = librosa.hz_to_midi(median_hz)
    note_name = librosa.midi_to_note(round(midi_note))
    print(f"[Sampler] 🎵 Detected base pitch: {median_hz:.1f} Hz → MIDI {midi_note:.1f} ({note_name})")
    return float(midi_note)


def render_with_sample(
    midi_path: str,
    sample_path: str,
    base_pitch: float | None = None,
) -> str:
    """
    Render a MIDI file using a one-shot sample instead of FluidSynth.

    For each MIDI note, the sample is pitch-shifted to match the note's pitch,
    scaled by velocity, trimmed/padded to note duration, and placed in time.

    Args:
        midi_path:   Path to the MIDI file.
        sample_path: Path to the one-shot WAV sample.
        base_pitch:  MIDI note number of the sample's pitch (auto-detected if None).

    Returns:
        Path to the rendered WAV file.
    """
    print("=" * 60)
    print("🎹 CUSTOM SAMPLE RENDERING")
    print(f"📁 MIDI:   {os.path.basename(midi_path)}")
    print(f"🔊 Sample: {os.path.basename(sample_path)}")
    print("=" * 60)

    # Load the sample
    sample, sr = librosa.load(sample_path, sr=SAMPLE_RATE, mono=True)
    print(f"[Sampler] Sample loaded: {len(sample)} samples ({len(sample)/sr:.2f}s)")

    # Detect base pitch if not provided
    if base_pitch is None:
        base_pitch = detect_base_pitch(sample_path)
    print(f"[Sampler] Base pitch: MIDI {base_pitch:.1f}")

    # Load MIDI
    midi = pretty_midi.PrettyMIDI(midi_path)
    end_time = midi.get_end_time()
    if end_time <= 0:
        end_time = 1.0

    # Allocate output buffer (with 1s padding)
    output_length = int((end_time + 1.0) * sr)
    output = np.zeros(output_length, dtype=np.float32)

    total_notes = 0

    for inst in midi.instruments:
        for note in inst.notes:
            total_notes += 1

            # Semitone shift from sample's base pitch to the target note
            n_steps = note.pitch - base_pitch

            # Pitch-shift the sample
            if abs(n_steps) < 0.01:
                shifted = sample.copy()
            else:
                shifted = librosa.effects.pitch_shift(
                    y=sample,
                    sr=sr,
                    n_steps=n_steps,
                )

            # Scale by velocity (0-127 → 0.0-1.0)
            velocity_scale = note.velocity / 127.0
            shifted = shifted * velocity_scale

            # Determine note duration in samples
            note_dur_samples = int((note.end - note.start) * sr)

            # Trim or pad the shifted sample to match note duration
            if len(shifted) > note_dur_samples:
                # Apply a short fade-out at the end to avoid clicks
                fade_len = min(int(0.01 * sr), note_dur_samples)
                shifted = shifted[:note_dur_samples]
                if fade_len > 0:
                    fade = np.linspace(1.0, 0.0, fade_len)
                    shifted[-fade_len:] *= fade
            # If sample is shorter than note, just use as-is (natural decay)

            # Place in the output buffer
            start_sample = int(note.start * sr)
            end_sample = start_sample + len(shifted)

            # Extend output if needed
            if end_sample > len(output):
                output = np.pad(output, (0, end_sample - len(output)))

            output[start_sample:end_sample] += shifted

    print(f"[Sampler] ✅ Rendered {total_notes} notes with custom sample")

    # Normalize to prevent clipping
    peak = np.max(np.abs(output))
    if peak > 0:
        output = output / peak * 0.9

    # Write output
    output_path = generate_filepath("wav")
    sf.write(output_path, output, sr)
    print(f"[Sampler] 💾 Output: {os.path.basename(output_path)}")
    print("=" * 60)

    return output_path
