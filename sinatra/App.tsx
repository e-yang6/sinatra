import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { SidebarLeft } from './components/SidebarLeft';
import { Timeline } from './components/Timeline';
import { Terminal } from './components/Terminal';
import { InstrumentType, TrackData, Note } from './types';
import { uploadDrum, uploadVocal, renderMidi } from './api';

// ---- WAV encoding utility ----
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// ---- Constants ----
const BEATS_PER_BAR = 4;

const INITIAL_TRACKS: TrackData[] = [
  { id: '1', name: 'Drum Loop', type: 'audio', volume: 0.8, isMuted: false, isSolo: false },
];

// ---- Metronome click (Web Audio, sample-accurate) ----
function scheduleClick(ctx: AudioContext, time: number, isDownbeat: boolean) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = isDownbeat ? 1000 : 800;
  gain.gain.setValueAtTime(isDownbeat ? 0.35 : 0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  osc.start(time);
  osc.stop(time + 0.06);
}

const App: React.FC = () => {
  // ---- Core UI state ----
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [bpm, setBpm] = useState(124);
  const [metronome, setMetronome] = useState(true);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [tracks, setTracks] = useState<TrackData[]>(INITIAL_TRACKS);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('1');

  // ---- Backend state ----
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [error, setError] = useState<string | null>(null);
  
  // ---- Audio visualization state ----
  const [audioLevels, setAudioLevels] = useState<number[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // ---- Terminal state ----
  const [terminalHeight, setTerminalHeight] = useState(96);

  // ---- Audio for playback ----
  const trackAudioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const drumAudioUrlRef = useRef<string | null>(null);
  const drumAudioElRef = useRef<HTMLAudioElement | null>(null);

  // ---- Recording refs ----
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recorderNodeRef = useRef<ScriptProcessorNode | null>(null);
  const recordedChunksRef = useRef<Float32Array[]>([]);
  const recordingTargetRef = useRef<{ trackId: string; instrument: InstrumentType } | null>(null);

  // ---- Track ID counter ----
  const nextTrackIdRef = useRef(2);

  // ---- Transport refs ----
  const transportStartRef = useRef(0);
  const playheadStartSecRef = useRef(0);
  const animFrameRef = useRef(0);
  const metronomeTimerRef = useRef(0);
  const nextBeatRef = useRef(0);

  // ---- Derived values ----
  const selectedTrack = tracks.find(t => t.id === selectedTrackId);
  const selectedInstrument = selectedTrack?.instrument || InstrumentType.PIANO;

  // ==================================
  //  TRACK MANAGEMENT
  // ==================================
  const addTrack = useCallback((): string => {
    const id = String(nextTrackIdRef.current++);
    const colors = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];
    const colorIndex = (nextTrackIdRef.current - 2) % colors.length;
    const newTrack: TrackData = {
      id,
      name: `Track ${id}`,
      type: 'midi',
      volume: 1.0,
      isMuted: false,
      isSolo: false,
      instrument: InstrumentType.PIANO,
      color: colors[colorIndex],
    };
    setTracks(prev => [...prev, newTrack]);
    setSelectedTrackId(id);
    return id;
  }, []);

  const handleSelectTrack = useCallback((id: string) => {
    setSelectedTrackId(id);
  }, []);

  const handleInstrumentChange = useCallback((inst: InstrumentType) => {
    setSelectedTrackId(prev => {
      setTracks(tracks => tracks.map(t =>
        t.id === prev ? { ...t, instrument: inst } : t
      ));
      return prev;
    });
  }, []);

  // ==================================
  //  TRANSPORT — linear time (seconds)
  // ==================================
  const startTransport = useCallback((fromSec: number) => {
    playheadStartSecRef.current = fromSec;
    transportStartRef.current = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - transportStartRef.current) / 1000;
      setPlayheadSec(playheadStartSecRef.current + elapsed);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const stopTransport = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  // ==================================
  //  METRONOME
  // ==================================
  const startMetronome = useCallback((ctx: AudioContext, currentBpm: number) => {
    // Stop any existing metronome first
    clearInterval(metronomeTimerRef.current);
    
    const beatSec = 60 / currentBpm;
    let beat = 0;
    nextBeatRef.current = ctx.currentTime;

    const scheduler = () => {
      // Recalculate beatSec in case BPM changed
      const currentBeatSec = 60 / bpm;
      while (nextBeatRef.current < ctx.currentTime + 0.1) {
        scheduleClick(ctx, nextBeatRef.current, beat % BEATS_PER_BAR === 0);
        nextBeatRef.current += currentBeatSec;
        beat++;
      }
    };
    metronomeTimerRef.current = window.setInterval(scheduler, 25);
    scheduler();
  }, [bpm]);

  const stopMetronome = useCallback(() => {
    clearInterval(metronomeTimerRef.current);
  }, []);

  // ==================================
  //  DRUM LOOP
  // ==================================
  const startDrumPlayback = useCallback((fromSec: number = 0) => {
    if (!drumAudioUrlRef.current) return;
    if (!drumAudioElRef.current) drumAudioElRef.current = new Audio();
    const el = drumAudioElRef.current;
    el.src = drumAudioUrlRef.current;
    el.loop = true;
    // Set volume from track state
    const drumTrack = tracks.find(t => t.id === '1');
    if (drumTrack) {
      el.volume = drumTrack.volume;
    }
    // Seek within the loop
    if (el.duration) {
      el.currentTime = fromSec % el.duration;
    } else {
      el.currentTime = 0;
    }
    el.play().catch(() => {});
  }, [tracks]);

  const stopDrumPlayback = useCallback(() => {
    if (drumAudioElRef.current) {
      drumAudioElRef.current.pause();
      drumAudioElRef.current.currentTime = 0;
    }
  }, []);

  // ==================================
  //  SEEK — jump to any point
  // ==================================
  const handleSeek = (sec: number) => {
    setPlayheadSec(sec);

    if (isPlaying) {
      // Restart transport from new position
      playheadStartSecRef.current = sec;
      transportStartRef.current = performance.now();

      // Seek drum
      if (drumAudioElRef.current?.duration) {
        drumAudioElRef.current.currentTime = sec % drumAudioElRef.current.duration;
      }

      // Seek all other tracks
      trackAudioMapRef.current.forEach((el) => {
        if (el.duration) {
          if (sec < el.duration) {
            el.currentTime = sec;
            if (el.paused) el.play().catch(() => {});
          } else {
            el.pause();
          }
        }
      });
    }
  };

  // ==============================
  //  RECORDING
  // ==============================
  const startRecording = async () => {
    try {
      setError(null);
      setStatusMessage('Requesting mic access...');

      // Determine target track — auto-create if drum track is selected
      let targetId = selectedTrackId;
      let instrument = selectedInstrument;
      if (targetId === '1') {
        targetId = addTrack();
        instrument = InstrumentType.PIANO;
      }
      recordingTargetRef.current = { trackId: targetId, instrument };

      // Create AudioContext NOW (inside the click gesture) so it won't be suspended
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      mediaStreamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);

      // Create analyser for real-time audio visualization
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 60;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 4000;

      const processor = ctx.createScriptProcessor(4096, 1, 1);
      recorderNodeRef.current = processor;
      recordedChunksRef.current = [];

      const NOISE_GATE = 0.005;
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const gated = new Float32Array(input.length);
        let peak = 0;
        for (let j = 0; j < input.length; j++) {
          peak = Math.max(peak, Math.abs(input[j]));
        }
        if (peak > NOISE_GATE) {
          gated.set(input);
        }
        recordedChunksRef.current.push(gated);
      };

      // Connect audio nodes: source -> analyser -> filters -> processor -> destination
      source.connect(analyser);
      analyser.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(processor);
      processor.connect(ctx.destination);

      // Start audio level visualization with better frequency analysis
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      const waveformData = new Uint8Array(analyser.fftSize);
      const isRecordingRef = { current: true };
      
      const updateLevels = () => {
        if (!analyserRef.current || !isRecordingRef.current) {
          animationFrameRef.current = null;
          return;
        }
        
        // Get frequency data
        analyserRef.current.getByteFrequencyData(frequencyData);
        // Get waveform data for more accurate visualization
        analyserRef.current.getByteTimeDomainData(waveformData);
        
        // Use logarithmic scaling for better frequency representation
        // Map frequencies more accurately (lower frequencies get more bars)
        const numBars = 60;
        const levels: number[] = [];
        
        for (let i = 0; i < numBars; i++) {
          // Logarithmic mapping for better frequency distribution
          const logIndex = Math.pow(i / numBars, 1.5) * frequencyData.length;
          const index = Math.floor(logIndex);
          const nextIndex = Math.min(index + 1, frequencyData.length - 1);
          
          // Interpolate between adjacent bins for smoother visualization
          const value = frequencyData[index];
          const nextValue = frequencyData[nextIndex];
          const interpolated = value + (nextValue - value) * (logIndex - index);
          
          // Normalize and apply smoothing
          const normalized = Math.min(1, interpolated / 255);
          levels.push(normalized);
        }
        
        setAudioLevels(levels);
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();
      
      // Store ref for cleanup
      (recordingTargetRef.current as any).isRecordingRef = isRecordingRef;

      // Recording always starts from 0
      setPlayheadSec(0);
      setIsRecording(true);
      setNotes([]);
      startTransport(0);
      
      // Start drum playback only if not muted
      const drumTrack = tracks.find(t => t.id === '1');
      if (drumTrack && !drumTrack.isMuted) {
        startDrumPlayback(0);
      }
      
      if (metronome) startMetronome(ctx, bpm);

      // Play back all other recorded tracks from 0
      tracks.forEach(track => {
        if (track.id === '1') return;
        if (track.id === targetId) return;
        if (track.isMuted) return;
        const el = trackAudioMapRef.current.get(track.id);
        if (el?.src) {
          el.currentTime = 0;
          el.volume = track.volume;
          el.play().catch(() => {});
        }
      });

      console.log('[Sinatra] Recording started on track', targetId, 'with', instrument);
      setStatusMessage(`Recording on Track ${targetId} (${instrument})...`);
    } catch (err: any) {
      console.error('[Sinatra] Mic error:', err);
      setError(err?.message || 'Could not access microphone');
      setStatusMessage('Error');
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    stopTransport();
    stopDrumPlayback();
    stopMetronome();

    // Stop audio visualization
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if ((recordingTargetRef.current as any)?.isRecordingRef) {
      (recordingTargetRef.current as any).isRecordingRef.current = false;
    }
    analyserRef.current = null;
    setAudioLevels([]);

    // Stop all other tracks
    trackAudioMapRef.current.forEach(el => {
      el.pause();
      el.currentTime = 0;
    });

    recorderNodeRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());

    const sampleRate = audioCtxRef.current?.sampleRate ?? 44100;
    audioCtxRef.current?.close();

    const chunks = recordedChunksRef.current;
    console.log(`[Sinatra] Recording stopped. ${chunks.length} chunks captured at ${sampleRate}Hz`);

    if (chunks.length === 0) {
      setError('No audio was captured — check your mic permissions');
      setStatusMessage('Error');
      return;
    }

    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const totalSeconds = totalLength / sampleRate;
    console.log(`[Sinatra] Total samples: ${totalLength} (${totalSeconds.toFixed(1)}s)`);

    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const maxAmp = merged.reduce((max, s) => Math.max(max, Math.abs(s)), 0);
    console.log(`[Sinatra] Peak amplitude: ${maxAmp.toFixed(4)}`);
    if (maxAmp < 0.001) {
      setError('Recording was silent — make sure your mic is working');
      setStatusMessage('Error');
      return;
    }

    // Normalize audio to a reasonable level (target peak at 0.8 to avoid clipping)
    // This boosts quiet recordings significantly
    const targetPeak = 0.8;
    const gain = maxAmp > 0 ? targetPeak / maxAmp : 1.0;
    const normalized = new Float32Array(merged.length);
    for (let i = 0; i < merged.length; i++) {
      normalized[i] = merged[i] * gain;
    }
    console.log(`[Sinatra] Applied gain: ${gain.toFixed(2)}x (peak: ${maxAmp.toFixed(4)} → ${targetPeak})`);

    const wavBlob = encodeWav(normalized, sampleRate);
    const wavFile = new File([wavBlob], 'recording.wav', { type: 'audio/wav' });

    const target = recordingTargetRef.current;
    if (!target) return;

    setStatusMessage(`Processing ${totalSeconds.toFixed(1)}s of audio...`);
    await handleVocalUpload(wavFile, target.trackId, target.instrument);
  };

  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // ==============================
  //  BACKEND CALLS
  // ==============================
  const handleDrumUpload = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setStatusMessage('Detecting BPM...');
    try {
      const res = await uploadDrum(file);
      setBpm(res.bpm);

      if (drumAudioUrlRef.current) URL.revokeObjectURL(drumAudioUrlRef.current);
      drumAudioUrlRef.current = URL.createObjectURL(file);

      const el = drumAudioElRef.current || new Audio();
      el.src = drumAudioUrlRef.current;
      el.loop = true;
      // Set volume from track state
      const drumTrack = tracks.find(t => t.id === '1');
      if (drumTrack) {
        el.volume = drumTrack.volume;
      }
      el.addEventListener('loadedmetadata', () => {
        setTracks(prev => prev.map(t =>
          t.id === '1' ? { ...t, name: `Drum Loop (${res.bpm} BPM)`, audioUrl: drumAudioUrlRef.current || undefined, audioDuration: el.duration } : t
        ));
      });
      drumAudioElRef.current = el;

      setStatusMessage(`BPM: ${res.bpm} — drum loop ready. Hit + to add a track, then record!`);
      setTracks(prev => prev.map(t =>
        t.id === '1' ? { ...t, name: `Drum Loop (${res.bpm} BPM)`, audioUrl: drumAudioUrlRef.current || undefined } : t
      ));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Drum upload failed';
      setError(msg);
      setStatusMessage('Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVocalUpload = async (file: File, targetTrackId?: string, instrument?: InstrumentType) => {
    const trackId = targetTrackId || selectedTrackId;
    const inst = instrument || selectedTrack?.instrument || InstrumentType.PIANO;
    const isRawAudio = inst === InstrumentType.RAW_AUDIO;

    if (trackId === '1') {
      setError('Select or create a vocal track first (not the drum track)');
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    if (isRawAudio) {
      setStatusMessage('Storing raw audio...');
    } else {
      setStatusMessage('Converting vocal to MIDI...');
    }

    // Show raw vocal waveform immediately
    const vocalUrl = URL.createObjectURL(file);
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, audioUrl: vocalUrl } : t
    ));

    try {
      console.log(`[Sinatra] Uploading vocal for track ${trackId}: ${file.size} bytes, instrument: ${inst}, raw: ${isRawAudio}`);
      await uploadVocal(file, isRawAudio);

      if (isRawAudio) {
        // Raw audio: just use the original file
        const audioEl = trackAudioMapRef.current.get(trackId) || new Audio();
        audioEl.src = vocalUrl;
        audioEl.addEventListener('loadedmetadata', () => {
          setTracks(prev => prev.map(t =>
            t.id === trackId ? { ...t, audioUrl: vocalUrl, audioDuration: audioEl.duration } : t
          ));
        });
        trackAudioMapRef.current.set(trackId, audioEl);

        setTracks(prev => prev.map(t =>
          t.id === trackId ? { ...t, name: `Raw Audio (Track ${trackId})`, audioUrl: vocalUrl } : t
        ));
        setStatusMessage(`Done! Raw audio track ${trackId} ready.`);
      } else {
        // MIDI mode: render with instrument
        setStatusMessage(`Rendering with ${inst}...`);
        const audioBlob = await renderMidi(inst);
        console.log(`[Sinatra] Rendered audio: ${audioBlob.size} bytes`);

        const url = URL.createObjectURL(audioBlob);

        // Store audio element for layered playback
        const audioEl = trackAudioMapRef.current.get(trackId) || new Audio();
        audioEl.src = url;
        audioEl.addEventListener('loadedmetadata', () => {
          setTracks(prev => prev.map(t =>
            t.id === trackId ? { ...t, audioUrl: url, audioDuration: audioEl.duration } : t
          ));
        });
        trackAudioMapRef.current.set(trackId, audioEl);

        // Revoke old vocal URL
        URL.revokeObjectURL(vocalUrl);

        // Update track with rendered audio
        setTracks(prev => prev.map(t =>
          t.id === trackId ? { ...t, name: `${inst} (Track ${trackId})`, audioUrl: url } : t
        ));
        setStatusMessage(`Done! Track ${trackId} ready. Add more tracks or press Play.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Vocal processing failed';
      console.error('[Sinatra] Vocal upload/render error:', msg);
      setError(msg);
      setStatusMessage('Error');
    } finally {
      setIsProcessing(false);
    }
  };

  // ==============================
  //  TRANSPORT CONTROLS
  // ==============================
  const handlePlayToggle = async () => {
    if (isPlaying) {
      // ---- PAUSE: save position ----
      const elapsed = (performance.now() - transportStartRef.current) / 1000;
      const currentSec = playheadStartSecRef.current + elapsed;
      setPlayheadSec(currentSec);
      setIsPlaying(false);
      stopTransport();
      stopMetronome();

      // Pause all audio (keep position)
      if (drumAudioElRef.current) drumAudioElRef.current.pause();
      trackAudioMapRef.current.forEach(el => el.pause());
    } else {
      // ---- PLAY from current playheadSec ----
      setIsPlaying(true);
      startTransport(playheadSec);

      // Start metronome if enabled (create AudioContext if needed)
      if (metronome) {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new AudioContext();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        startMetronome(ctx, bpm);
      }

      // Start drum from position (loops) - only if not muted
      const drumTrack = tracks.find(t => t.id === '1');
      if (drumAudioElRef.current?.src && drumTrack && !drumTrack.isMuted) {
        if (drumAudioElRef.current.duration) {
          drumAudioElRef.current.currentTime = playheadSec % drumAudioElRef.current.duration;
        }
        drumAudioElRef.current.volume = drumTrack.volume;
        drumAudioElRef.current.play().catch(() => {});
      }

      // Play all non-muted tracks from position
      tracks.forEach(track => {
        if (track.id === '1') return; // drum handled above
        if (track.isMuted) return;
        const el = trackAudioMapRef.current.get(track.id);
        if (el?.src && el.duration) {
          if (playheadSec < el.duration) {
            el.currentTime = playheadSec;
            el.volume = track.volume;
            el.play().catch(() => {});
          }
        }
      });
    }
  };

  const handleStop = () => {
    if (isRecording) stopRecording();
    setIsPlaying(false);
    setIsRecording(false);
    stopTransport();
    stopMetronome();
    setPlayheadSec(0);

    if (drumAudioElRef.current) {
      drumAudioElRef.current.pause();
      drumAudioElRef.current.currentTime = 0;
    }
    trackAudioMapRef.current.forEach(el => {
      el.pause();
      el.currentTime = 0;
    });
  };

  const handleDeleteTrack = (id: string) => {
    // Don't allow deleting the drum track
    if (id === '1') return;

    // Stop and cleanup audio element
    const el = trackAudioMapRef.current.get(id);
    if (el) {
      el.pause();
      el.src = '';
      trackAudioMapRef.current.delete(id);
    }

    // Remove from tracks
    setTracks(prev => prev.filter(t => t.id !== id));

    // If this was the selected track, select the drum track
    if (selectedTrackId === id) {
      setSelectedTrackId('1');
    }
  };

  const handleUpdateTrack = (id: string, updates: Partial<TrackData>) => {
    setTracks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      
      // Apply mute/unmute in real-time if playing
      if (updates.isMuted !== undefined) {
        const track = updated.find(t => t.id === id);
        if (track) {
          if (id === '1') {
            // Drum track
            if (drumAudioElRef.current) {
              if (track.isMuted) {
                drumAudioElRef.current.pause();
              } else if (isPlaying) {
                if (drumAudioElRef.current.duration) {
                  drumAudioElRef.current.currentTime = playheadSec % drumAudioElRef.current.duration;
                }
                drumAudioElRef.current.play().catch(() => {});
              }
            }
          } else {
            // Other tracks
            const el = trackAudioMapRef.current.get(id);
            if (el) {
              if (track.isMuted) {
                el.pause();
              } else if (isPlaying && el.src) {
                if (el.duration && playheadSec < el.duration) {
                  el.currentTime = playheadSec;
                  el.volume = track.volume;
                  el.play().catch(() => {});
                }
              }
            }
          }
        }
      }
      
      // Apply volume changes in real-time
      if (updates.volume !== undefined) {
        const track = updated.find(t => t.id === id);
        if (track && !track.isMuted) {
          if (id === '1') {
            // Drum track volume
            if (drumAudioElRef.current) {
              drumAudioElRef.current.volume = updates.volume;
            }
          } else {
            const el = trackAudioMapRef.current.get(id);
            if (el) el.volume = updates.volume;
          }
        }
      }
      
      return updated;
    });
  };

  // Restart metronome when BPM changes during recording/playback
  useEffect(() => {
    if ((isRecording || isPlaying) && metronome && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      if (ctx.state !== 'closed') {
        stopMetronome();
        startMetronome(ctx, bpm);
      }
    }
  }, [bpm, isRecording, isPlaying, metronome, startMetronome, stopMetronome]);

  // Start/stop metronome when toggle changes during playback
  useEffect(() => {
    if (isPlaying && !isRecording && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      if (ctx.state === 'closed') return;
      
      if (metronome) {
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => startMetronome(ctx, bpm));
        } else {
          startMetronome(ctx, bpm);
        }
      } else {
        stopMetronome();
      }
    }
  }, [metronome, isPlaying, isRecording, bpm, startMetronome, stopMetronome]);

  // ==============================
  //  RENDER
  // ==============================
  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-200 overflow-hidden">
      <Header
        isPlaying={isPlaying}
        isRecording={isRecording}
        bpm={bpm}
        metronome={metronome}
        onPlayToggle={handlePlayToggle}
        onRecordToggle={handleRecordToggle}
        onStop={handleStop}
        onBpmChange={setBpm}
        onMetronomeToggle={() => setMetronome(!metronome)}
      />

      <div className="flex flex-1 overflow-hidden">
        <SidebarLeft
          selectedInstrument={selectedInstrument}
          onInstrumentChange={handleInstrumentChange}
          isRecording={isRecording}
          onRecordStart={handleRecordToggle}
          onDrumUpload={handleDrumUpload}
          onAddTrack={addTrack}
          selectedTrackName={selectedTrack?.name || 'None'}
          isDrumSelected={selectedTrackId === '1'}
        />

        <Timeline
          playheadSec={playheadSec}
          tracks={tracks}
          notes={notes}
          selectedTrackId={selectedTrackId}
          isPlaying={isPlaying}
          onSelectTrack={handleSelectTrack}
          onUpdateTrack={handleUpdateTrack}
          onAddTrack={addTrack}
          onDeleteTrack={handleDeleteTrack}
          onSeek={handleSeek}
        />
      </div>

      <Terminal 
        isRecording={isRecording} 
        audioLevels={audioLevels}
        height={terminalHeight}
        onHeightChange={setTerminalHeight}
      />
    </div>
  );
};

export default App;
