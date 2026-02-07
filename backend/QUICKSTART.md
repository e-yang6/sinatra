# Sinatra — How to Run

You need **two terminals**: one for the backend, one for the frontend.

---

## Prerequisites

- **Python 3.12** (3.14 won't work — TensorFlow doesn't support it)
- **Node.js** (for the frontend)
- **FluidSynth** installed on your system
- **A SoundFont file** (.sf2)

### Install Python 3.12

If you only have Python 3.14, install 3.12 from:
https://www.python.org/downloads/release/python-31211/

Check "Add to PATH" during install. Verify with:
```
py -3.12 --version
```

---

## Terminal 1 — Backend (Windows)

```powershell
cd backend

# Create virtual environment with Python 3.12
py -3.12 -m venv venv

# Activate it
.\venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt

# Set SoundFont path (replace with your actual path)
$env:SOUNDFONT_PATH="C:\Users\jerem\Downloads\FluidR3_GM\FluidR3_GM.sf2"

# Start server
uvicorn main:app --reload --port 8000
```

Server runs at **http://localhost:8000**

Test it: open http://localhost:8000/health in your browser.

---

## Terminal 1 - Backend (MAC)

# 1) Create and activate venv (Python 3.12)
python3.12 -m venv venv
source venv/bin/activate

# 2) Install dependencies
pip install -r requirements.txt

# 3) Install FluidSynth (macOS)
brew install fluidsynth

# 4) Set SoundFont path (adjust if your filename differs)
export SOUNDFONT_PATH="/Users/jeffreywongbusiness/Downloads/FluidR3_GM/FluidR3_GM.sf2"

# 5) Run the backend
uvicorn main:app --reload --port 8000

---

## Terminal 2 — Frontend

```powershell
cd sinatra

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

Frontend runs at **http://localhost:3000**

---

## Using the App

1. Open **http://localhost:3000** in Chrome
2. **Upload a drum loop** — drag a WAV file onto the left sidebar, or click to browse. BPM will auto-detect and show in the header.
3. **Record your voice** — click "Record Melody", sing into your mic, click again to stop. The app will:
   - Send the recording to the backend
   - Convert it to MIDI
   - Render it as the selected instrument
4. **Or upload a vocal WAV** — click "Or Upload WAV File" if you have a pre-recorded file
5. **Pick an instrument** — Piano, Synth, Strings, or Bass (select before recording/uploading)
6. **Press Play** — plays the rendered instrument audio

The status bar at the bottom shows what's happening at each step.

---

## Getting a SoundFont

You need a `.sf2` file for the backend to render MIDI to audio.

Download **FluidR3_GM.sf2** from:
https://member.keymusician.com/Member/FluidR3_GM/index.html

Or use any General MIDI SoundFont. Put it somewhere and set the path:

```powershell
$env:SOUNDFONT_PATH="C:\path\to\FluidR3_GM.sf2"
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `pip install` fails with TensorFlow error | You're on Python 3.14. Use `py -3.12 -m venv venv` |
| `.\venv\Scripts\Activate.ps1` opens Notepad | Use `.\venv\Scripts\activate.bat` instead |
| "No SoundFont found" on `/render` | Set `$env:SOUNDFONT_PATH` to your `.sf2` file path |
| Mic not working | Use Chrome and allow mic permission when prompted |
| CORS errors in browser console | Make sure backend is running on port 8000 |
| Port 8000 in use | `uvicorn main:app --reload --port 8001` (update `API_BASE` in `sinatra/api.ts` too) |
| Frontend can't connect to backend | Both must be running at the same time |
