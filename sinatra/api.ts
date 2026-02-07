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
  midi_filename: string;
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
 * Upload a vocal WAV file and convert to MIDI
 */
export async function uploadVocal(file: File): Promise<UploadVocalResponse> {
  const formData = new FormData();
  formData.append('file', file);

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

/**
 * Render the latest MIDI to WAV with the selected instrument
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
