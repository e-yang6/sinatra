import librosa


def detect_bpm(file_path: str) -> float:
    """
    Load a WAV file and estimate its BPM using librosa.
    Resamples to 22050 Hz mono for speed.
    """
    y, sr = librosa.load(file_path, sr=22050, mono=True)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    # librosa may return an ndarray with one element; extract the float
    if hasattr(tempo, "__len__"):
        tempo = float(tempo[0])
    return round(float(tempo), 1)
