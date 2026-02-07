export enum InstrumentType {
  PIANO = 'Piano',
  SYNTH = 'Synth',
  STRINGS = 'Strings',
  BASS = 'Bass'
}

export enum KeyScale {
  C_MAJOR = 'C Major',
  A_MINOR = 'A Minor',
  G_MAJOR = 'G Major',
  E_MINOR = 'E Minor',
  CHROMATIC = 'Chromatic'
}

export interface Note {
  id: string;
  startTick: number; // 0-100% of the view for simplicity in this MVP
  duration: number; // percentage width
  pitch: number; // 0-12 relative scale degree
}

export interface TrackData {
  id: string;
  name: string;
  type: 'audio' | 'midi';
  volume: number;
  isMuted: boolean;
  isSolo: boolean;
  audioUrl?: string; // URL to the audio file for display
}