export enum InstrumentType {
  // Piano
  PIANO = 'Piano',
  ELECTRIC_PIANO = 'Electric Piano',
  HARPSICHORD = 'Harpsichord',

  // Strings
  STRINGS = 'Strings',
  VIOLIN = 'Violin',
  CELLO = 'Cello',

  // Brass
  TRUMPET = 'Trumpet',
  TROMBONE = 'Trombone',
  FRENCH_HORN = 'French Horn',

  // Woodwinds
  FLUTE = 'Flute',
  SAXOPHONE = 'Saxophone',
  CLARINET = 'Clarinet',

  // Synth
  SYNTH = 'Synth',
  SYNTH_PAD = 'Synth Pad',
  SYNTH_LEAD = 'Synth Lead',

  // Bass
  BASS = 'Bass',
  ACOUSTIC_BASS = 'Acoustic Bass',

  // Guitar
  GUITAR = 'Guitar',
  ELECTRIC_GUITAR = 'Electric Guitar',

  // Other
  ORGAN = 'Organ',

  // Raw audio (no MIDI conversion)
  RAW_AUDIO = 'Raw Audio',

  // Custom one-shot sample (pitch-shifted to play MIDI notes)
  CUSTOM_SAMPLE = 'Custom Sample',
}

// Musical keys (root notes)
export const MUSICAL_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const;
export type MusicalKey = typeof MUSICAL_KEYS[number];

// Scale types
export const SCALE_TYPES = ['chromatic', 'major', 'minor'] as const;
export type ScaleType = typeof SCALE_TYPES[number];

// Quantize grid options
export const QUANTIZE_OPTIONS = ['off', '1/4', '1/8', '1/16', '1/32'] as const;
export type QuantizeOption = typeof QUANTIZE_OPTIONS[number];

export interface Clip {
  id: string;
  startSec: number;              // Where the clip starts on the timeline (seconds)
  durationSec: number;           // Visible/audible duration after trimming (seconds)
  audioUrl: string;               // Blob URL for the audio data
  offsetSec: number;              // Trim offset into the audio file (seconds, for left-edge trim)
  originalDurationSec: number;    // Full untrimmed audio duration (seconds)
  midiFilename?: string;          // Backend MIDI filename for re-rendering with different instruments
  storageUrl?: string;            // URL in Supabase Storage (for persistence)
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
  audioUrl?: string; // URL to the audio file for display (drum track)
  instrument?: InstrumentType; // Instrument assigned to this track
  audioDuration?: number; // Duration in seconds (drum track)
  color?: string; // Hex color for track customization
  unmutedVolume?: number; // Volume before muting (for restoration)
  clips?: Clip[]; // Audio clips on this track
}