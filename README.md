# Sinatra
AI-powered Digital Audio Workstation with vocal-to-instrument conversion and intelligent music production  
Transform your voice into any instrument, generate chord progressions, and create professional music with AI assistance

---

## Overview

Traditional music production requires expensive hardware, complex software, and years of training. Recording vocals and converting them to instruments typically involves multiple tools, manual MIDI editing, and deep music theory knowledge. Even with professional DAWs, the barrier to entry remains high.

That's why we built **Sinatra**: an AI-powered Digital Audio Workstation that makes music production accessible to everyone. Sing into your microphone, and watch your voice transform into any instrument in real-time. Generate chord progressions through natural language, create custom instruments from audio samples, and control everything with voice commands - all in your browser.

Sinatra combines Spotify's Basic Pitch for vocal-to-MIDI transcription, FluidSynth for instrument rendering, AI-powered chord generation, and an intelligent assistant named Frank. Record multiple tracks, layer sounds, edit clips visually, and export your creations as audio or video with stunning 3D visualizers - no downloads, no installations, just pure creativity.

---

## Terminal 1 — Backend (WINDOWS)

```powershell
cd backend

# Create virtual environment with Python 3.12
py -3.12 -m venv venv

# Activate it
.\venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt

# Set SoundFont path (replace with your actual path)
$env:SOUNDFONT_PATH="C:\soundfonts\FluidR3_GM.sf2"

# Chatbot
pip install google-genai gradio_client python-dotenv

# Start server
uvicorn main:app --reload --port 8000
```

Server runs at **http://localhost:8000**

Test it: open http://localhost:8000/health in your browser.

---

## Terminal 1 - Backend (MAC)

```powershell
# 1) Create and activate venv (Python 3.12)
python3.12 -m venv venv
source venv/bin/activate

# 2) Install dependencies
pip install -r requirements.txt
pip install basic-pitch

# 3) Install FluidSynth (macOS)
brew install fluidsynth

# 4) Set SoundFont path (adjust if your filename differs)
export SOUNDFONT_PATH=<FILE_PATH_HERE>

# 5) Run the backend
uvicorn main:app --reload --port 8000
```

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

## Features

- **Vocal-to-MIDI transcription** using Spotify's Basic Pitch with pitch snapping and scale mapping
- **Real-time instrument rendering** via FluidSynth with 128+ General MIDI instruments
- **Custom sample instruments** - upload one-shot samples and use them as pitch-shifted instruments
- **AI chord progression generation** - request chord progressions through natural language
- **Multi-track recording and playback** with unlimited tracks and layered audio
- **Clip-based editing** - move, resize, delete, and drag clips between tracks
- **Musical key and scale control** - snap notes to major, minor, or chromatic scales
- **Quantization** - align notes to rhythmic grids (1/4, 1/8, 1/16, triplets)
- **BPM detection** - automatically detect tempo from drum loops
- **Real-time metronome** synchronized with playback and recording
- **Playhead seeking** - jump to any point in the timeline for recording or playback
- **Track customization** - color, volume, mute, solo, and dynamic naming
- **Raw audio recording** with client-side normalization
- **AI assistant (Frank)** - voice-controlled DAW with speech-to-text via Gradium
- **Undo/Redo system** with keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- **Export functionality** - render as WAV audio or MP4 video with 3D visualizer
- **Project management** - create, edit, delete, and organize projects with Supabase
- **User authentication** - secure sign-in and project storage

---

## Architecture

**Vocal-to-MIDI Pipeline**  
Audio Recording → Basic Pitch (ML Transcription) → Pitch Snapping → Scale Mapping → Quantization → MIDI Generation → Pretty MIDI

**MIDI Rendering Pipeline**  
MIDI File → FluidSynth → Soundfont (General MIDI) → WAV Audio → Web Audio API → Playback

**Custom Sample Pipeline**  
Audio Upload → Base Pitch Detection (Librosa) → MIDI Note Mapping → Pitch Shifting → Sample Playback

**Chord Generation Pipeline**  
Natural Language Request → AI Parsing → Chord Progression → MIDI Generation → FluidSynth Rendering → Track Addition

**AI Assistant Pipeline**  
Voice Input (Gradium STT) → Text Processing → OpenRouter API → Action Detection → DAW Control Commands

**Export Pipeline**  
Project Audio → FFmpeg (Browser) → Three.js Visualizer → Canvas Rendering → Video Encoding → MP4/WAV Export

---

## Tech Stack

| Category | Technologies |
|---------|--------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, Uvicorn |
| Audio Processing | Librosa, Pretty MIDI, PyFluidSynth, Soundfile, Basic Pitch |
| Speech Recognition | Gradium STT (WebSocket) |
| AI/ML | Spotify Basic Pitch, OpenRouter (Gemini), Google Generative AI |
| 3D Graphics | Three.js |
| Video/Audio Export | FFmpeg.wasm, MediaRecorder API |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| Audio APIs | Web Audio API, MediaRecorder API |

---

## How It Works

1. User records vocals through browser microphone or uploads audio files.
2. Basic Pitch (Spotify ML model) analyzes audio and generates MIDI notes with pitch and timing.
3. Backend applies pitch snapping to nearest semitone based on selected musical key.
4. Notes are filtered to match selected scale (major, minor, or chromatic).
5. Quantization aligns note timing to rhythmic grid (1/4, 1/8, 1/16, triplets).
6. MIDI file is rendered to WAV using FluidSynth with selected instrument (piano, guitar, etc.).
7. Custom samples can be uploaded - system detects base pitch and pitch-shifts for MIDI notes.
8. Multiple tracks can be recorded and layered for complex compositions.
9. Clips can be moved, resized, and dragged between tracks (auto re-renders).
10. AI assistant (Frank) processes voice/text commands via Gradium STT and OpenRouter.
11. Chord progressions can be generated through natural language requests.
12. Projects are saved to Supabase with track data, clips, and settings.
13. Final compositions can be exported as WAV audio or MP4 video with 3D visualizer.

---

## Future Roadmap

- Mobile app for iOS and Android
- Real-time collaboration with multiple users
- Advanced audio effects and mixing tools
- MIDI editing interface with piano roll
- Integration with music streaming services
- AI-powered melody generation and harmonization
- Support for more audio formats and higher quality exports
- Plugin system for custom instruments and effects
- Cloud storage integration for project backups
- Social features for sharing and discovering music

---

## Team

| Member |
|--------|
| Jeremy Liu |
| Jeffrey Wong |
| Ethan Yang |

---

## Links

- GitHub Repository: https://github.com/e-yang6/sinatra
