# Sinatra

## Running the TypeScript Frontend

1. Navigate to the `sinatra` directory:
   ```bash
   cd sinatra
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to the URL shown in the terminal (typically `http://localhost:5173`)

## Project Dependencies

- **librosa** for BPM analysis (uploading a drum loop and detecting BPM)
- **basic pitch** (Spotify) for pitch detection and conversion into MIDI
- **pyFluidSynth** (Python wrapper for FluidSynth) - FluidSynth takes a MIDI and outputs it in the desired instrument
