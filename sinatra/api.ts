/**
 * Simple API client for Sinatra backend
 */

const API_BASE = 'http://localhost:8000';

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

// ==================== CHAT API ====================

export interface ChatAction {
  type: 'ADD_TRACK' | 'SET_BPM' | 'CHANGE_INSTRUMENT' | 'TRANSPORT';
  instrument?: string;
  value?: number;
  command?: string;
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
  tracks: Array<{
    id: string;
    name: string;
    instrument?: string;
    isMuted: boolean;
  }>;
}

/**
 * Send a text message to the AI chatbot
 */
export async function sendChatMessage(
  message: string,
  context?: ProjectContext
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
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
 * Send a voice recording to the AI chatbot (speech-to-text + chat)
 */
export async function sendVoiceMessage(
  audioBlob: Blob,
  context?: ProjectContext
): Promise<ChatResponse> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'voice.webm');
  formData.append('context', JSON.stringify(context || {}));

  const response = await fetch(`${API_BASE}/chat/voice`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Voice chat failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Clear the chat conversation history
 */
export async function clearChatHistory(): Promise<void> {
  await fetch(`${API_BASE}/chat/clear`, { method: 'POST' });
}
