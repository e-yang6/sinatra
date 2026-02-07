"""
Chord progression generator — creates MIDI from chord symbols and renders to WAV.
Supports common chord types (major, minor, 7th, dim, aug, sus, etc.)
"""

import os
import pretty_midi
import numpy as np
import soundfile as sf

from services.synth import render_midi_to_wav, INSTRUMENT_PROGRAMS
from utils.file_helpers import generate_filepath

# ---- Chord definitions (semitone intervals from root) ----
CHORD_INTERVALS = {
    "maj":    [0, 4, 7],
    "":       [0, 4, 7],        # default = major
    "min":    [0, 3, 7],
    "m":      [0, 3, 7],
    "dim":    [0, 3, 6],
    "aug":    [0, 4, 8],
    "7":      [0, 4, 7, 10],
    "maj7":   [0, 4, 7, 11],
    "min7":   [0, 3, 7, 10],
    "m7":     [0, 3, 7, 10],
    "dim7":   [0, 3, 6, 9],
    "sus2":   [0, 2, 7],
    "sus4":   [0, 5, 7],
    "add9":   [0, 4, 7, 14],
    "6":      [0, 4, 7, 9],
    "m6":     [0, 3, 7, 9],
    "9":      [0, 4, 7, 10, 14],
    "m9":     [0, 3, 7, 10, 14],
    "11":     [0, 4, 7, 10, 14, 17],
    "13":     [0, 4, 7, 10, 14, 21],
    "5":      [0, 7],            # power chord
}

# Note name to MIDI pitch (octave 4 = middle C region)
NOTE_MAP = {
    "C": 60, "C#": 61, "Db": 61,
    "D": 62, "D#": 63, "Eb": 63,
    "E": 64, "Fb": 64,
    "F": 65, "F#": 66, "Gb": 66,
    "G": 67, "G#": 68, "Ab": 68,
    "A": 69, "A#": 70, "Bb": 70,
    "B": 71, "Cb": 71,
}


def parse_chord(symbol: str) -> list[int]:
    """
    Parse a chord symbol like 'Cmaj7', 'Am', 'F#dim', 'Bb7' into MIDI note numbers.
    Returns a list of MIDI pitches (in octave 4 region).
    """
    symbol = symbol.strip()
    if not symbol:
        raise ValueError("Empty chord symbol")

    # Extract root note (1 or 2 characters)
    if len(symbol) >= 2 and symbol[1] in ('#', 'b'):
        root_name = symbol[:2]
        quality = symbol[2:]
    else:
        root_name = symbol[0]
        quality = symbol[1:]

    root_pitch = NOTE_MAP.get(root_name)
    if root_pitch is None:
        raise ValueError(f"Unknown root note: '{root_name}' in chord '{symbol}'")

    # Normalize quality
    quality_lower = quality.lower()
    
    # Try exact match first, then progressively shorter matches
    intervals = None
    for key in sorted(CHORD_INTERVALS.keys(), key=len, reverse=True):
        if quality_lower == key.lower():
            intervals = CHORD_INTERVALS[key]
            break
    
    if intervals is None:
        # Fallback: try common aliases
        if quality_lower.startswith("min") or quality_lower.startswith("m") and not quality_lower.startswith("maj"):
            if "7" in quality_lower:
                intervals = CHORD_INTERVALS["m7"]
            else:
                intervals = CHORD_INTERVALS["m"]
        elif quality_lower.startswith("maj"):
            if "7" in quality_lower:
                intervals = CHORD_INTERVALS["maj7"]
            else:
                intervals = CHORD_INTERVALS["maj"]
        else:
            # Default to major
            intervals = CHORD_INTERVALS[""]

    return [root_pitch + interval for interval in intervals]


def generate_chord_progression(
    chords: list[str],
    bpm: float = 120.0,
    beats_per_chord: int = 4,
    instrument: str = "Piano",
    octave_shift: int = 0,
    velocity: int = 80,
    pattern: str = "block",
) -> str:
    """
    Generate a MIDI file from a chord progression.
    
    Args:
        chords: List of chord symbols (e.g. ["Cmaj", "Am", "F", "G7"])
        bpm: Tempo in BPM
        beats_per_chord: How many beats each chord lasts
        instrument: Instrument name for rendering
        octave_shift: Shift all notes by this many octaves (-2 to +2)
        velocity: MIDI velocity (1-127)
        pattern: "block" (sustained chords) or "arpeggiated" (broken chords)
    
    Returns:
        Path to the rendered WAV file
    """
    print("=" * 60)
    print("🎹 GENERATING CHORD PROGRESSION")
    print(f"   Chords: {' → '.join(chords)}")
    print(f"   BPM: {bpm}, Beats/chord: {beats_per_chord}")
    print(f"   Instrument: {instrument}, Pattern: {pattern}")
    print("=" * 60)

    # Create MIDI
    midi = pretty_midi.PrettyMIDI(initial_tempo=bpm)
    program = INSTRUMENT_PROGRAMS.get(instrument, 0)
    midi_instrument = pretty_midi.Instrument(program=program, name=instrument)

    seconds_per_beat = 60.0 / bpm

    for chord_idx, chord_symbol in enumerate(chords):
        try:
            pitches = parse_chord(chord_symbol)
        except ValueError as e:
            print(f"   ⚠️ Skipping chord '{chord_symbol}': {e}")
            continue

        # Apply octave shift
        pitches = [p + (octave_shift * 12) for p in pitches]
        # Clamp to valid MIDI range
        pitches = [max(0, min(127, p)) for p in pitches]

        chord_start = chord_idx * beats_per_chord * seconds_per_beat
        chord_duration = beats_per_chord * seconds_per_beat

        if pattern == "arpeggiated":
            # Arpeggiate: each note starts slightly after the previous
            arp_delay = seconds_per_beat / len(pitches)  # spread across one beat
            for note_idx, pitch in enumerate(pitches):
                note_start = chord_start + (note_idx * arp_delay)
                note_end = chord_start + chord_duration
                note = pretty_midi.Note(
                    velocity=velocity,
                    pitch=pitch,
                    start=note_start,
                    end=note_end,
                )
                midi_instrument.notes.append(note)
        else:
            # Block chord: all notes play together
            for pitch in pitches:
                note = pretty_midi.Note(
                    velocity=velocity,
                    pitch=pitch,
                    start=chord_start,
                    end=chord_start + chord_duration,
                )
                midi_instrument.notes.append(note)

    midi.instruments.append(midi_instrument)

    # Save MIDI to temp file
    midi_path = generate_filepath("mid")
    midi.write(midi_path)
    print(f"   ✅ MIDI saved: {os.path.basename(midi_path)} ({len(midi_instrument.notes)} notes)")

    # Render to WAV using FluidSynth
    wav_path = render_midi_to_wav(midi_path, instrument)
    print(f"   ✅ WAV rendered: {os.path.basename(wav_path)}")
    print("=" * 60)

    return wav_path
