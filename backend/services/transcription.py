import librosa
import pretty_midi
import numpy as np
from scipy.ndimage import median_filter

from utils.file_helpers import generate_filepath

# ---- Tuning knobs ----
MIN_NOTE_DURATION = 0.08        # Ignore notes shorter than 80ms
VOICED_PROB_THRESHOLD = 0.3     # Trust frames with >30% voicing confidence
MEDIAN_KERNEL = 7               # Smooth pitch over ~160ms (7 frames × 23ms each)
RMS_SILENCE_THRESHOLD = 0.002   # Treat frames below this energy as silent


def vocal_to_midi(wav_path: str, bpm: float = 120.0) -> str:
    """
    Convert a vocal WAV recording to MIDI using librosa's pYIN pitch detector.
    Tuned for full melodic performances — ignores background noise and
    smooths out small pitch wobble so held notes stay on one pitch.

    Args:
        wav_path: Path to the input WAV file.
        bpm: Tempo to embed in the MIDI file (from drum BPM detection).
    """
    # Load audio — mono, 22050 Hz
    y, sr = librosa.load(wav_path, sr=22050, mono=True)

    hop_length = 512

    # ---- Energy-based silence detection ----
    # Compute RMS energy per frame — frames below threshold are silent
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop_length)[0]

    # ---- Pitch detection (pYIN) ----
    f0, voiced_flag, voiced_probs = librosa.pyin(
        y,
        sr=sr,
        fmin=librosa.note_to_hz('C2'),
        fmax=librosa.note_to_hz('C6'),
        frame_length=2048,
        hop_length=hop_length,
    )

    n_frames = min(len(f0), len(rms), len(voiced_flag), len(voiced_probs))
    times = librosa.frames_to_time(np.arange(n_frames), sr=sr, hop_length=hop_length)

    # ---- Convert to MIDI pitch values with strict voicing ----
    midi_pitches = np.zeros(n_frames)
    for i in range(n_frames):
        is_voiced = (
            voiced_flag[i]
            and not np.isnan(f0[i])
            and voiced_probs[i] >= VOICED_PROB_THRESHOLD
            and rms[i] >= RMS_SILENCE_THRESHOLD
        )
        if is_voiced:
            midi_pitches[i] = librosa.hz_to_midi(f0[i])

    # ---- Heavy median filter to kill pitch jitter ----
    voiced_mask = midi_pitches > 0
    if np.any(voiced_mask):
        smoothed = median_filter(midi_pitches, size=MEDIAN_KERNEL)
        midi_pitches = np.where(voiced_mask, np.round(smoothed).astype(int), 0)

    # ---- Build MIDI notes ----
    midi = pretty_midi.PrettyMIDI(initial_tempo=bpm)
    instrument = pretty_midi.Instrument(program=0, name='Vocal')

    current_note_start = None
    current_pitch = None

    for i in range(n_frames):
        pitch = int(midi_pitches[i])

        if pitch > 0:
            pitch = int(np.clip(pitch, 0, 127))

            if current_pitch is None:
                current_note_start = times[i]
                current_pitch = pitch
            elif pitch != current_pitch:
                duration = times[i] - current_note_start
                if duration >= MIN_NOTE_DURATION:
                    instrument.notes.append(pretty_midi.Note(
                        velocity=100,
                        pitch=current_pitch,
                        start=current_note_start,
                        end=times[i],
                    ))
                current_note_start = times[i]
                current_pitch = pitch
        else:
            if current_pitch is not None:
                duration = times[i] - current_note_start
                if duration >= MIN_NOTE_DURATION:
                    instrument.notes.append(pretty_midi.Note(
                        velocity=100,
                        pitch=current_pitch,
                        start=current_note_start,
                        end=times[i],
                    ))
                current_pitch = None
                current_note_start = None

    # Close final note
    if current_pitch is not None and current_note_start is not None:
        end_time = times[-1] if n_frames > 0 else 0
        duration = end_time - current_note_start
        if duration >= MIN_NOTE_DURATION:
            instrument.notes.append(pretty_midi.Note(
                velocity=100,
                pitch=current_pitch,
                start=current_note_start,
                end=end_time,
            ))

    # ---- Merge adjacent notes of the same pitch (kills micro-gaps) ----
    merged_notes = []
    for note in sorted(instrument.notes, key=lambda n: n.start):
        if merged_notes and note.pitch == merged_notes[-1].pitch and (note.start - merged_notes[-1].end) < 0.08:
            # Extend previous note
            merged_notes[-1].end = note.end
        else:
            merged_notes.append(note)

    instrument.notes = merged_notes
    midi.instruments.append(instrument)

    midi_path = generate_filepath("mid")
    midi.write(midi_path)

    print(f"[Transcription] {len(instrument.notes)} notes from {times[-1]:.1f}s of audio")
    return midi_path
