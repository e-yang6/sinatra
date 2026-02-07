import os
import uuid
import wave

# Directory for temporary uploads and generated files
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def generate_filepath(extension: str = "wav") -> str:
    """Generate a unique file path in the uploads directory."""
    filename = f"{uuid.uuid4().hex}.{extension}"
    return os.path.join(UPLOAD_DIR, filename)


def validate_wav(file_path: str) -> bool:
    """Quick check that a file is a valid WAV."""
    try:
        with wave.open(file_path, "rb") as wf:
            wf.getparams()
        return True
    except Exception:
        return False


async def save_upload(upload_file, extension: str = "wav") -> str:
    """Save an uploaded file to disk and return the path."""
    file_path = generate_filepath(extension)
    contents = await upload_file.read()
    with open(file_path, "wb") as f:
        f.write(contents)
    return file_path


def cleanup_file(file_path: str) -> None:
    """Remove a file if it exists. Fail silently."""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except OSError:
        pass
