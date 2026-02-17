import os
import sys
import numpy as np
import pretty_midi
import soundfile as sf
import time

# Add cwd to path to find services
sys.path.insert(0, os.getcwd())

try:
    from services.synth import render_midi_to_wav
except ImportError:
    print("Could not import render_midi_to_wav. Make sure you are in the backend directory.")
    sys.exit(1)

def test_latency():
    # 1. Create a MIDI file with a note at 0.0s
    midi = pretty_midi.PrettyMIDI(initial_tempo=120)
    inst = pretty_midi.Instrument(program=0) # Piano
    note = pretty_midi.Note(velocity=100, pitch=60, start=0.0, end=0.1)
    inst.notes.append(note)
    midi.instruments.append(inst)
    
    midi_filename = "test_latency.mid"
    midi.write(midi_filename)
    print(f"Created {midi_filename}")

    # 2. Render to WAV
    print("Rendering to WAV...")
    wav_path = render_midi_to_wav(midi_filename, instrument="Piano")
    print(f"Rendered to {wav_path}")

    # 3. Analyze WAV for silence
    audio, samplerate = sf.read(wav_path)
    print(f"Loaded WAV. Samplerate: {samplerate}, Channels: {audio.ndim}")

    # Convert to mono if stereo
    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)

    # Find first sample > threshold
    threshold = 0.01 # -40dB approx
    indices = np.where(np.abs(audio) > threshold)[0]

    if len(indices) == 0:
        print("Detailed Error: Rendered audio is silent!")
        return

    first_sample = indices[0]
    latency_ms = (first_sample / samplerate) * 1000
    print(f"First non-silent sample at: {first_sample}")
    print(f"Latency: {latency_ms:.2f} ms")

    # Cleanup
    try:
        os.remove(midi_filename)
        os.remove(wav_path)
    except:
        pass

if __name__ == "__main__":
    test_latency()
