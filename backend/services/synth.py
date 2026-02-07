import os
import numpy as np
import soundfile as sf

# Try to import fluidsynth, but handle the DLL path issue gracefully
try:
    # Patch the DLL directory issue before importing
    if hasattr(os, 'add_dll_directory'):
        # Try common FluidSynth installation paths
        possible_paths = [
            'C:\\Users\\tteth\\Downloads\\fluidsynth-v2.5.2-win10-x64-cpp11\\fluidsynth-v2.5.2-win10-x64-cpp11\\bin',  # User's location
            'C:\\tools\\fluidsynth\\bin',
            'C:\\Program Files\\FluidSynth\\bin',
            'C:\\Program Files (x86)\\FluidSynth\\bin',
            os.path.join(os.path.expanduser('~'), 'fluidsynth', 'bin'),
        ]
        for path in possible_paths:
            if os.path.isdir(path):
                try:
                    os.add_dll_directory(path)
                    os.environ['PATH'] = path + ';' + os.environ.get('PATH', '')
                except (OSError, FileNotFoundError):
                    pass
    
    import fluidsynth
    import pretty_midi
    HAS_FLUIDSYNTH = True
except (ImportError, FileNotFoundError, OSError) as e:
    # If fluidsynth import fails, we'll use a fallback
    HAS_FLUIDSYNTH = False
    print(f"Warning: FluidSynth not available: {e}")
    print("MIDI rendering will not work. Install FluidSynth or use alternative.")

from utils.file_helpers import generate_filepath

# --- SoundFont Configuration ---
SOUNDFONT_PATH = os.environ.get(
    "SOUNDFONT_PATH",
    "C:/soundfonts/FluidR3_GM.sf2"
)

# General MIDI program numbers for our instrument types
# Based on General MIDI (GM) standard - 128 programs available
INSTRUMENT_PROGRAMS = {
    # Piano
    "Piano": 0,              # Acoustic Grand Piano
    "Electric Piano": 4,     # Electric Piano 1
    "Harpsichord": 6,        # Harpsichord
    
    # Strings
    "Strings": 48,           # String Ensemble 1
    "Violin": 40,            # Violin
    "Cello": 42,             # Cello
    
    # Brass
    "Trumpet": 56,           # Trumpet
    "Trombone": 57,          # Trombone
    "French Horn": 60,       # French Horn
    
    # Woodwinds
    "Flute": 73,             # Flute
    "Saxophone": 65,         # Alto Sax
    "Clarinet": 71,          # Clarinet
    
    # Synth
    "Synth": 80,             # Lead 1 (square)
    "Synth Pad": 89,         # Pad 1 (new age)
    "Synth Lead": 81,        # Lead 2 (sawtooth)
    
    # Bass
    "Bass": 33,              # Electric Bass (finger)
    "Acoustic Bass": 32,     # Acoustic Bass
    
    # Guitar
    "Guitar": 24,            # Acoustic Guitar (nylon)
    "Electric Guitar": 27,   # Electric Guitar (clean)
    
    # Other
    "Organ": 19,             # Church Organ
    "Drums": 128,            # Drums (channel 10, but we use 128 as marker)
}

SAMPLE_RATE = 44100


def _find_soundfont() -> str:
    """Try common SoundFont locations, return the first that exists."""
    candidates = [
        SOUNDFONT_PATH,
        "C:/Users/tteth/Downloads/FluidR3_GM/FluidR3_GM.sf2",  # User's location
        "C:/soundfonts/FluidR3_GM.sf2",
        "C:/soundfonts/default.sf2",
        os.path.expanduser("~/soundfonts/FluidR3_GM.sf2"),
        os.path.expanduser("~/Downloads/FluidR3_GM/FluidR3_GM.sf2"),
        "/usr/share/soundfonts/FluidR3_GM.sf2",
        "/usr/share/sounds/sf2/FluidR3_GM.sf2",
        "/usr/local/share/fluidsynth/FluidR3_GM.sf2",
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    raise FileNotFoundError(
        f"No SoundFont (.sf2) found. Set SOUNDFONT_PATH env var or place a .sf2 at one of: {candidates}"
    )


def render_midi_to_wav(
    midi_path: str,
    instrument: str = "Piano",
) -> str:
    """
    Render a MIDI file to WAV using FluidSynth.
    """
    if not HAS_FLUIDSYNTH:
        raise RuntimeError(
            "FluidSynth is not available. Please install FluidSynth:\n"
            "Windows: Download from https://www.fluidsynth.org/ or use: choco install fluidsynth\n"
            "Then ensure the FluidSynth bin directory is in your PATH."
        )
    
    sf2_path = _find_soundfont()
    output_path = generate_filepath("wav")

    # Load the MIDI
    midi = pretty_midi.PrettyMIDI(midi_path)

    # Optionally remap all instruments to the selected program
    program = INSTRUMENT_PROGRAMS.get(instrument, 0)
    for inst in midi.instruments:
        inst.program = program
        inst.is_drum = False

    # Synthesize using pretty_midi's fluidsynth integration
    audio = midi.fluidsynth(fs=SAMPLE_RATE, sf2_path=sf2_path)

    # Normalize to prevent clipping
    if np.max(np.abs(audio)) > 0:
        audio = audio / np.max(np.abs(audio)) * 0.9

    # Write to WAV
    sf.write(output_path, audio, SAMPLE_RATE)

    return output_path
