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
  instrument?: InstrumentType; // Instrument assigned to this track
  audioDuration?: number; // Duration in seconds for waveform sync
  color?: string; // Hex color for track customization
}