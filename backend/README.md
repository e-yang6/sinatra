# Sinatra Backend - Setup & Run Guide

## Prerequisites

1. **Python 3.8+** installed
2. **FluidSynth** installed on your system
3. **A SoundFont file (.sf2)** - you'll need to download one if you don't have it

---

## Step 1: Install Python Dependencies

Open a terminal in the `backend` directory and run:

```bash
pip install -r requirements.txt
```

**Note:** On some systems, you may need to use `pip3` instead of `pip`.

If you encounter issues with `librosa`, you may need to install system audio libraries first:
- **Windows:** Usually works out of the box
- **Linux:** `sudo apt-get install libsndfile1`
- **Mac:** `brew install libsndfile`

---

## Step 2: Install FluidSynth

### Windows

1. Download FluidSynth from: https://www.fluidsynth.org/
2. Or use Chocolatey: `choco install fluidsynth`
3. Or download a pre-built binary and add it to your PATH

### Linux

```bash
sudo apt-get install fluidsynth
# or
sudo yum install fluidsynth
```

### Mac

```bash
brew install fluidsynth
```

---

## Step 3: Get a SoundFont File

You need a `.sf2` (SoundFont 2) file for FluidSynth to render MIDI.

### Option A: Download FluidR3_GM (Recommended)

1. Download from: https://member.keymusician.com/Member/FluidR3_GM/index.html
2. Extract the `.sf2` file
3. Note the full path (e.g., `C:\soundfonts\FluidR3_GM.sf2`)

### Option B: Use a Free SoundFont

- **GeneralUser GS**: http://www.schristiancollins.com/generaluser.php
- **Timbres of Heaven**: https://sourceforge.net/projects/timbreheaven/

### Option C: Check if you already have one

Common locations:
- Windows: `C:\Program Files\FluidSynth\soundfonts\`
- Linux: `/usr/share/soundfonts/`
- Mac: `/usr/local/share/fluidsynth/`

---

## Step 4: Set SoundFont Path (Optional)

The backend will try to find a SoundFont automatically, but you can set it explicitly:

### Windows (PowerShell)
```powershell
$env:SOUNDFONT_PATH="C:\path\to\your\FluidR3_GM.sf2"
```

### Windows (Command Prompt)
```cmd
set SOUNDFONT_PATH=C:\path\to\your\FluidR3_GM.sf2
```

### Linux/Mac
```bash
export SOUNDFONT_PATH=/path/to/your/FluidR3_GM.sf2
```

**Note:** If you don't set this, the code will try common default locations. If it can't find one, you'll get a clear error message when you try to render.

---

## Step 5: Run the Server

From the `backend` directory:

```bash
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

The `--reload` flag enables auto-reload when you change code (useful for development).

---

## Step 6: Test the Server

### Quick Health Check

Open your browser and go to:
```
http://localhost:8000/health
```

You should see:
```json
{"status":"ok","session":{"drum_path":false,"drum_bpm":false,"vocal_path":false,"midi_path":false,"rendered_path":false}}
```

### API Documentation

FastAPI automatically generates interactive docs:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

You can test endpoints directly from the Swagger UI!

---

## Step 7: Test with a WAV File

### Using curl (Command Line)

**1. Upload a drum loop and detect BPM:**
```bash
curl -X POST "http://localhost:8000/upload-drum" -F "file=@path/to/your/drum_loop.wav"
```

**2. Upload a vocal recording:**
```bash
curl -X POST "http://localhost:8000/upload-vocal" -F "file=@path/to/your/vocal.wav"
```

**3. Render the MIDI to WAV:**
```bash
curl -X POST "http://localhost:8000/render?instrument=Piano" -o output.wav
```

**4. Or do it all in one request:**
```bash
curl -X POST "http://localhost:8000/process-all" \
  -F "vocal=@vocal.wav" \
  -F "drum=@drum_loop.wav" \
  -F "instrument=Piano" \
  -o output.wav
```

### Using Python

```python
import requests

# Upload drum
with open("drum_loop.wav", "rb") as f:
    response = requests.post("http://localhost:8000/upload-drum", files={"file": f})
    print(response.json())  # {"status": "ok", "bpm": 120.0, ...}

# Upload vocal
with open("vocal.wav", "rb") as f:
    response = requests.post("http://localhost:8000/upload-vocal", files={"file": f})
    print(response.json())  # {"status": "ok", "midi_filename": "..."}

# Render
response = requests.post("http://localhost:8000/render", data={"instrument": "Piano"})
with open("output.wav", "wb") as f:
    f.write(response.content)
```

---

## Troubleshooting

### "No SoundFont found" Error

**Problem:** When calling `/render`, you get: `FileNotFoundError: No SoundFont (.sf2) found`

**Solution:**
1. Make sure you have a `.sf2` file downloaded
2. Set the `SOUNDFONT_PATH` environment variable to the full path
3. Or place the `.sf2` file in one of the common locations the code checks

### "Module not found" Errors

**Problem:** `ModuleNotFoundError: No module named 'librosa'` (or similar)

**Solution:**
```bash
pip install -r requirements.txt
```

If that doesn't work, try:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### FluidSynth Not Found

**Problem:** `fluidsynth` command not found or import errors

**Solution:**
- Make sure FluidSynth is installed and on your PATH
- On Windows, you may need to add FluidSynth's `bin` directory to your PATH
- Restart your terminal after installing

### Port Already in Use

**Problem:** `ERROR: [Errno 48] Address already in use`

**Solution:**
- Use a different port: `uvicorn main:app --reload --port 8001`
- Or kill the process using port 8000:
  - Windows: `netstat -ano | findstr :8000` then `taskkill /PID <pid> /F`
  - Linux/Mac: `lsof -ti:8000 | xargs kill`

### BPM Detection Returns 0 or Very Low

**Problem:** BPM detection gives unrealistic values

**Solution:**
- Make sure your drum loop is actually a loop with a clear beat
- Try a different drum loop
- librosa's beat tracking works best on percussive audio

### Basic Pitch Transcription Fails

**Problem:** `/upload-vocal` returns an error

**Solution:**
- Make sure the WAV file is valid (not corrupted)
- Check that the file contains actual audio (not silence)
- Basic Pitch works best on monophonic vocals (single voice, clear pitch)

---

## File Structure After Running

When you run the server, it will create an `uploads/` directory:

```
backend/
├── main.py
├── requirements.txt
├── uploads/          # ← Created automatically
│   ├── abc123.wav    # Uploaded files
│   ├── def456.mid    # Generated MIDI
│   └── ghi789.wav    # Rendered output
└── ...
```

Files are stored with UUID names to prevent collisions. They persist between requests (useful for debugging), but you can delete them manually if needed.

---

## Connecting to the Frontend

The backend runs on `http://localhost:8000` by default.

Make sure your frontend (Vite dev server) is configured to call this URL. The backend has CORS enabled for all origins, so it should work out of the box.

Example frontend code:
```typescript
const response = await fetch('http://localhost:8000/upload-vocal', {
  method: 'POST',
  body: formData
});
```

---

## Production Notes

This is a **hackathon demo** setup. For production, you'd want to:
- Add authentication
- Use a proper database instead of in-memory session
- Add file cleanup/expiration
- Use environment variables for all config
- Add rate limiting
- Use a production ASGI server (not `--reload`)

But for now, this setup is perfect for a demo! 🚀
