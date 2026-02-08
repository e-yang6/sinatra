/**
 * Simple API client for Sinatra backend
 */

// Environment-aware API base URL
// In production, this should point to your deployed backend (e.g., Railway, Render, Fly.io)
// For local development, use localhost
const getApiBase = (): string => {
  // Check if we're in production (Vercel)
  if (import.meta.env.PROD) {
    // Use environment variable if set, otherwise fall back to a default
    // IMPORTANT: Set VITE_BACKEND_URL in Vercel environment variables
    return import.meta.env.VITE_BACKEND_URL || 'https://your-backend-url.railway.app';
  }
  // Development: use localhost
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
};

const API_BASE = getApiBase();

// For Vercel serverless functions, use relative paths in production
// In development, call the backend directly
const getServerlessApiPath = (path: string): string => {
  if (import.meta.env.DEV) {
    // In development, use the backend directly
    return `${API_BASE}${path}`;
  }
  // In production, use Vercel serverless functions
  return `/api${path}`;
};

export interface UploadDrumResponse {
  status: string;
  bpm: number;
  filename: string;
}

export interface UploadVocalResponse {
  status: string;
  midi_filename: string | null;
  raw_audio?: boolean;
}

/**
 * Upload a drum loop WAV file and get BPM
 */
export async function uploadDrum(file: File): Promise<UploadDrumResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload-drum`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Upload a vocal WAV file and convert to MIDI (or store as raw audio)
 * Optionally specify key, scale, and quantize for MIDI post-processing.
 */
export async function uploadVocal(
  file: File,
  rawAudio: boolean = false,
  options?: { key?: string; scale?: string; quantize?: string },
): Promise<UploadVocalResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('raw_audio', rawAudio.toString());
  if (options?.key) formData.append('key', options.key);
  if (options?.scale) formData.append('scale', options.scale);
  if (options?.quantize) formData.append('quantize', options.quantize);

  const response = await fetch(`${API_BASE}/upload-vocal`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface UploadSampleResponse {
  status: string;
  filename: string;
  base_pitch: number;
  note_name: string;
}

/**
 * Upload a one-shot audio sample for use as a custom instrument.
 * The backend detects the sample's base pitch automatically.
 */
export async function uploadSample(file: File): Promise<UploadSampleResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload-sample`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Render the latest MIDI to WAV with the selected instrument
 * If raw audio mode, returns the original audio file
 */
export async function renderMidi(instrument: string): Promise<Blob> {
  const formData = new FormData();
  formData.append('instrument', instrument);

  const response = await fetch(`${API_BASE}/render`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Rendering failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.blob();
}

/**
 * Re-render a specific MIDI file with a different instrument.
 * Used when clips move between tracks or when a track's instrument changes.
 */
export async function reRenderMidi(midiFilename: string, instrument: string): Promise<Blob> {
  const formData = new FormData();
  formData.append('midi_filename', midiFilename);
  formData.append('instrument', instrument);

  const response = await fetch(`${API_BASE}/re-render`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Re-rendering failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.blob();
}


/**
 * Process everything in one request: upload drum + vocal, render
 */
export async function processAll(
  vocalFile: File,
  drumFile: File | null,
  instrument: string
): Promise<{ blob: Blob; bpm?: number }> {
  const formData = new FormData();
  formData.append('vocal', vocalFile);
  if (drumFile) {
    formData.append('drum', drumFile);
  }
  formData.append('instrument', instrument);

  const response = await fetch(`${API_BASE}/process-all`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Processing failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  const bpmHeader = response.headers.get('X-Detected-BPM');
  const bpm = bpmHeader ? parseFloat(bpmHeader) : undefined;

  return {
    blob: await response.blob(),
    bpm,
  };
}

// ==================== CHORD GENERATION API ====================

export interface GenerateChordsRequest {
  chords: string[];
  bpm: number;
  beats_per_chord?: number;
  instrument?: string;
  octave_shift?: number;
  velocity?: number;
  pattern?: 'block' | 'arpeggiated';
}

/**
 * Generate a chord progression and get rendered audio back
 */
export async function generateChords(request: GenerateChordsRequest): Promise<Blob> {
  const response = await fetch(`${API_BASE}/generate-chords`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Chord generation failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.blob();
}

// ==================== CHAT API ====================

export interface ChatAction {
  type: 'ADD_TRACK' | 'SET_BPM' | 'CHANGE_INSTRUMENT' | 'TRANSPORT' | 'SET_KEY' | 'SET_SCALE' | 'SET_QUANTIZE' | 'GENERATE_CHORDS';
  instrument?: string;
  value?: number;
  command?: string;
  key?: string;
  scale?: string;
  quantize?: string;
  // Chord generation fields
  chords?: string[];
  beats_per_chord?: number;
  pattern?: 'block' | 'arpeggiated';
  octave_shift?: number;
  velocity?: number;
}

export interface ChatResponse {
  response: string;
  actions: ChatAction[];
  transcription?: string;
}

export interface ProjectContext {
  bpm: number;
  isPlaying: boolean;
  isRecording: boolean;
  selectedInstrument: string;
  key?: string;
  scale?: string;
  quantize?: string;
  tracks: Array<{
    id: string;
    name: string;
    instrument?: string;
    isMuted: boolean;
  }>;
}

/**
 * Send audio to backend for Groq Whisper transcription.
 * Returns the transcribed text.
 */
export async function transcribeVoice(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'voice.wav');

  const response = await fetch(`${API_BASE}/voice-transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Transcription failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.text;
}

/**
 * Send a text message to Frank (AI chatbot)
 * Uses Vercel serverless function in production, backend in development
 */
export async function sendChatMessage(
  message: string,
  context?: ProjectContext
): Promise<ChatResponse> {
  const apiPath = getServerlessApiPath('/chat');
  const response = await fetch(apiPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Chat request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Clear the chat conversation history
 * Uses Vercel serverless function in production, backend in development
 */
export async function clearChatHistory(): Promise<void> {
  const apiPath = getServerlessApiPath('/chat/clear');
  await fetch(apiPath, { method: 'POST' });
}
