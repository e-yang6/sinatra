import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { SidebarLeft } from './components/SidebarLeft';
import { Timeline } from './components/Timeline';
import { Terminal } from './components/Terminal';
import { Chatbot } from './components/Chatbot';
import { InstrumentType, TrackData, Note, Clip, MusicalKey, ScaleType, QuantizeOption, MUSICAL_KEYS, SCALE_TYPES, QUANTIZE_OPTIONS } from './types';
import { uploadDrum, uploadVocal, renderMidi, reRenderMidi, uploadSample, generateChords, ChatAction, ProjectContext } from './api';

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

interface DAWEditorProps {
  projectId?: string;
}

const DAWEditor: React.FC<DAWEditorProps> = ({ projectId }) => {
  // ---- Core UI state ----
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [bpm, setBpm] = useState(124);
  const [metronome, setMetronome] = useState(true);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [tracks, setTracks] = useState<TrackData[]>(INITIAL_TRACKS);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('1');
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // ---- Backend state ----
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [error, setError] = useState<string | null>(null);

  // ---- Custom sample state ----
  const [sampleName, setSampleName] = useState<string | undefined>();
  const [sampleNote, setSampleNote] = useState<string | undefined>();

  // ---- Key / Scale / Quantize state ----
  const [musicalKey, setMusicalKey] = useState<MusicalKey>('C');
  const [scaleType, setScaleType] = useState<ScaleType>('chromatic');
  const [quantize, setQuantize] = useState<QuantizeOption>('off');

  // ---- Audio visualization state ----
  const [audioLevels, setAudioLevels] = useState<number[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // ---- Terminal state ----
  const [terminalHeight, setTerminalHeight] = useState(220);
  const [recordingSessions, setRecordingSessions] = useState<Array<{
    id: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    status: 'success' | 'error' | 'in_progress';
    message?: string;
    sampleRate?: number;
    peakAmplitude?: number;
  }>>([]);
  const [currentPeakLevel, setCurrentPeakLevel] = useState(0);
  const [currentAvgLevel, setCurrentAvgLevel] = useState(0);

  // ---- Master volume state ----
  const [masterVolume, setMasterVolume] = useState(1.0);

  // ---- Chatbot state ----
  const [chatbotWidth, setChatbotWidth] = useState(400);

  // ---- Undo/Redo state ----
  const [history, setHistory] = useState<TrackData[][]>([INITIAL_TRACKS]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Apply master volume to all clip audio elements and drum
  useEffect(() => {
    clipAudioMapRef.current.forEach((el, clipId) => {
      const track = tracks.find(t => t.clips?.some(c => c.id === clipId));
      if (track) {
        el.volume = track.volume * masterVolume;
      }
    });
    if (drumAudioElRef.current) {
      const drumTrack = tracks.find(t => t.id === '1');
      if (drumTrack) {
        drumAudioElRef.current.volume = drumTrack.volume * masterVolume;
      }
    }
  }, [masterVolume, tracks]);

  // ---- Audio for playback ----
  const clipAudioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const clipTimeoutsRef = useRef<number[]>([]);
  const drumAudioUrlRef = useRef<string | null>(null);
  const drumAudioElRef = useRef<HTMLAudioElement | null>(null);

  // ---- Recording refs ----
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recorderNodeRef = useRef<ScriptProcessorNode | null>(null);
  const recordedChunksRef = useRef<Float32Array[]>([]);
  const recordingTargetRef = useRef<{ trackId: string; instrument: InstrumentType } | null>(null);
  const recordingStartSecRef = useRef<number>(0);

  // ---- ID counters ----
  const nextTrackIdRef = useRef(2);
  const nextClipIdRef = useRef(1);

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
      clips: [],
    };
    setTracks(prev => [...prev, newTrack]);
    setSelectedTrackId(id);
    return id;
  }, []);

  const handleSelectTrack = useCallback((id: string) => {
    setSelectedTrackId(id);
  }, []);

  const handleInstrumentChange = useCallback(async (inst: InstrumentType) => {
    const trackId = selectedTrackId;
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    const oldInstrument = track.instrument;

    // Update the instrument and name immediately
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, instrument: inst, name: `${inst} (Track ${t.id})` } : t
    ));

    // Re-render all clips that have MIDI files when the instrument changes
    const clipsWithMidi = (track.clips || []).filter(c => c.midiFilename);
    if (oldInstrument !== inst && clipsWithMidi.length > 0 && inst !== InstrumentType.RAW_AUDIO) {
      setIsProcessing(true);
      setStatusMessage(`Re-rendering ${clipsWithMidi.length} clip(s) for ${inst}...`);

      for (const clip of clipsWithMidi) {
        try {
          const audioBlob = await reRenderMidi(clip.midiFilename!, inst);
          const renderedUrl = URL.createObjectURL(audioBlob);

          setTracks(prev => prev.map(t => {
            if (t.id !== trackId) return t;
            const updatedClips = (t.clips || []).map(c =>
              c.id === clip.id ? { ...c, audioUrl: renderedUrl } : c
            );
            return { ...t, clips: updatedClips };
          }));

          // Update audio element
          const audioEl = clipAudioMapRef.current.get(clip.id);
          if (audioEl) {
            audioEl.src = renderedUrl;
          } else {
            clipAudioMapRef.current.set(clip.id, new Audio(renderedUrl));
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Re-rendering failed';
          console.error(`[Sinatra] Failed to re-render clip ${clip.id}:`, msg);
          setError(msg);
        }
      }

      setIsProcessing(false);
      setStatusMessage(`Done! ${clipsWithMidi.length} clip(s) re-rendered for ${inst}.`);
    }
  }, [selectedTrackId, tracks]);

  // ==================================
  //  TRANSPORT ΓÇö linear time (seconds)
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
    clearInterval(metronomeTimerRef.current);
    let beat = 0;
    nextBeatRef.current = ctx.currentTime;

    const scheduler = () => {
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
    const drumTrack = tracks.find(t => t.id === '1');
    if (drumTrack) {
      el.volume = drumTrack.volume * masterVolume;
    }
    if (el.duration) {
      el.currentTime = fromSec % el.duration;
    } else {
      el.currentTime = 0;
    }
    el.play().catch(() => {});
  }, [tracks, masterVolume]);

  const stopDrumPlayback = useCallback(() => {
    if (drumAudioElRef.current) {
      drumAudioElRef.current.pause();
      drumAudioElRef.current.currentTime = 0;
    }
  }, []);

  // ==================================
  //  CLIP PLAYBACK SCHEDULING
  // ==================================
  const scheduleClipPlayback = useCallback((fromSec: number, excludeTrackId?: string) => {
    // Clear existing timeouts
    clipTimeoutsRef.current.forEach(clearTimeout);
    clipTimeoutsRef.current = [];

    // Pause all clip audio
    clipAudioMapRef.current.forEach(el => el.pause());

    tracks.forEach(track => {
      if (track.id === '1' || track.isMuted || !track.clips) return;
      if (excludeTrackId && track.id === excludeTrackId) return;

      track.clips.forEach(clip => {
        const el = clipAudioMapRef.current.get(clip.id);
        if (!el) return;

        el.volume = track.volume * masterVolume;
        const clipEnd = clip.startSec + clip.durationSec;
        const audioOffset = clip.offsetSec || 0;

        if (fromSec >= clip.startSec && fromSec < clipEnd) {
          // Playhead is inside clip ΓÇö play from correct audio position
          el.currentTime = audioOffset + (fromSec - clip.startSec);
          el.play().catch(() => {});
          // Schedule stop at clip's trimmed end
          const remainingDuration = clipEnd - fromSec;
          const stopTid = window.setTimeout(() => { el.pause(); }, remainingDuration * 1000);
          clipTimeoutsRef.current.push(stopTid);
        } else if (fromSec < clip.startSec) {
          // Clip is ahead ΓÇö schedule it
          const delayMs = (clip.startSec - fromSec) * 1000;
          const tid = window.setTimeout(() => {
            el.currentTime = audioOffset;
            el.play().catch(() => {});
            // Schedule stop at clip's trimmed end
            const stopTid = window.setTimeout(() => { el.pause(); }, clip.durationSec * 1000);
            clipTimeoutsRef.current.push(stopTid);
          }, delayMs);
          clipTimeoutsRef.current.push(tid);
        }
      });
    });
  }, [tracks, masterVolume]);

  const stopClipPlayback = useCallback(() => {
    clipTimeoutsRef.current.forEach(clearTimeout);
    clipTimeoutsRef.current = [];
    clipAudioMapRef.current.forEach(el => {
      el.pause();
      el.currentTime = 0;
    });
  }, []);

  const pauseClipPlayback = useCallback(() => {
    clipTimeoutsRef.current.forEach(clearTimeout);
    clipTimeoutsRef.current = [];
    clipAudioMapRef.current.forEach(el => el.pause());
  }, []);

  // ==================================
  //  SEEK ΓÇö jump to any point
  // ==================================
  const handleSeek = (sec: number) => {
    setPlayheadSec(sec);
    setSelectedClipId(null); // Deselect clip on seek

    if (isPlaying) {
      playheadStartSecRef.current = sec;
      transportStartRef.current = performance.now();

      // Seek drum
      if (drumAudioElRef.current?.duration) {
        drumAudioElRef.current.currentTime = sec % drumAudioElRef.current.duration;
      }

      // Re-schedule clips from new position
      scheduleClipPlayback(sec);
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

      // Require a sample to be uploaded for Custom Sample instrument
      if (instrument === InstrumentType.CUSTOM_SAMPLE && !sampleName) {
        setError('Upload a one-shot sample first before recording with Custom Sample.');
        setStatusMessage('Error');
        return;
      }

      recordingTargetRef.current = { trackId: targetId, instrument };

      // Save recording start position (record from wherever the marker is)
      const recordStartSec = playheadSec;
      recordingStartSecRef.current = recordStartSec;

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

      // Connect audio nodes
      source.connect(analyser);
      analyser.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(processor);
      processor.connect(ctx.destination);

      // Create new recording session
      const sessionId = Date.now().toString();
      setRecordingSessions(prev => [...prev, {
        id: sessionId,
        startTime: new Date(),
        status: 'in_progress',
        message: 'Recording started',
      }]);

      // Start audio level visualization
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      const waveformData = new Uint8Array(analyser.fftSize);
      const isRecordingRef = { current: true };

      const updateLevels = () => {
        if (!analyserRef.current || !isRecordingRef.current) {
          animationFrameRef.current = null;
          return;
        }
        analyserRef.current.getByteFrequencyData(frequencyData);
        analyserRef.current.getByteTimeDomainData(waveformData);
        let peak = 0;
        let sum = 0;
        for (let i = 0; i < waveformData.length; i++) {
          const normalized = Math.abs((waveformData[i] - 128) / 128);
          peak = Math.max(peak, normalized);
          sum += normalized;
        }
        setCurrentPeakLevel(peak);
        setCurrentAvgLevel(sum / waveformData.length);
        const numBars = 60;
        const levels: number[] = [];
        for (let i = 0; i < numBars; i++) {
          const logIndex = Math.pow(i / numBars, 1.5) * frequencyData.length;
          const index = Math.floor(logIndex);
          const nextIndex = Math.min(index + 1, frequencyData.length - 1);
          const interpolated = frequencyData[index] + (frequencyData[nextIndex] - frequencyData[index]) * (logIndex - index);
          levels.push(Math.min(1, interpolated / 255));
        }
        setAudioLevels(levels);
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();
      (recordingTargetRef.current as any).isRecordingRef = isRecordingRef;

      // Start from current playhead position (NOT always 0)
      setIsRecording(true);
      setNotes([]);
      startTransport(recordStartSec);

      // Start drum playback from position
      const drumTrack = tracks.find(t => t.id === '1');
      if (drumTrack && !drumTrack.isMuted) {
        startDrumPlayback(recordStartSec);
      }

      if (metronome) startMetronome(ctx, bpm);

      // Play other tracks' clips from position
      scheduleClipPlayback(recordStartSec, targetId);

      console.log('[Sinatra] Recording started on track', targetId, 'at', recordStartSec.toFixed(1), 's');
      setStatusMessage(`Recording on Track ${targetId} (${instrument})...`);
    } catch (err: any) {
      console.error('[Sinatra] Mic error:', err);
      setError(err?.message || 'Could not access microphone');
      setStatusMessage('Error');
      setRecordingSessions(prev => {
        const updated = [...prev];
        const latest = updated[updated.length - 1];
        if (latest?.status === 'in_progress') {
          latest.status = 'error';
          latest.message = err?.message || 'Could not access microphone';
          latest.endTime = new Date();
        }
        return updated;
      });
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
    setCurrentPeakLevel(0);
    setCurrentAvgLevel(0);

    // Stop all clips
    stopClipPlayback();

    recorderNodeRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());

    const sampleRate = audioCtxRef.current?.sampleRate ?? 44100;
    const endTime = new Date();
    audioCtxRef.current?.close();

    const chunks = recordedChunksRef.current;
    console.log(`[Sinatra] Recording stopped. ${chunks.length} chunks at ${sampleRate}Hz`);

    // Update recording session
    setRecordingSessions(prev => {
      const updated = [...prev];
      const latest = updated[updated.length - 1];
      if (latest?.status === 'in_progress') {
        const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
        const totalSeconds = totalLength / sampleRate;
        const tempMerged = new Float32Array(totalLength);
        let off = 0;
        for (const chunk of chunks) { tempMerged.set(chunk, off); off += chunk.length; }
        const maxAmp = tempMerged.reduce((max, s) => Math.max(max, Math.abs(s)), 0);
        latest.endTime = endTime;
        latest.duration = totalSeconds;
        latest.sampleRate = sampleRate;
        latest.peakAmplitude = maxAmp;
        latest.status = chunks.length === 0 ? 'error' : maxAmp < 0.001 ? 'error' : 'success';
        latest.message = chunks.length === 0 ? 'No audio captured' : maxAmp < 0.001 ? 'Recording was silent' : `Captured ${totalSeconds.toFixed(1)}s`;
      }
      return updated;
    });

    if (chunks.length === 0) {
      setError('No audio was captured ΓÇö check your mic permissions');
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
      setError('Recording was silent ΓÇö make sure your mic is working');
      setStatusMessage('Error');
      return;
    }

    // Normalize audio
    const targetPeak = 0.8;
    const gain = maxAmp > 0 ? targetPeak / maxAmp : 1.0;
    const normalized = new Float32Array(merged.length);
    for (let i = 0; i < merged.length; i++) {
      normalized[i] = merged[i] * gain;
    }
    console.log(`[Sinatra] Applied gain: ${gain.toFixed(2)}x`);

    const wavBlob = encodeWav(normalized, sampleRate);
    const wavFile = new File([wavBlob], 'recording.wav', { type: 'audio/wav' });

    const target = recordingTargetRef.current;
    if (!target) return;

    // Create clip at the recording start position
    const clipId = `clip-${Date.now()}-${nextClipIdRef.current++}`;
    const recordingStartSec = recordingStartSecRef.current;
    const vocalUrl = URL.createObjectURL(wavFile);

    const newClip: Clip = {
      id: clipId,
      startSec: recordingStartSec,
      durationSec: totalSeconds,
      audioUrl: vocalUrl,
      offsetSec: 0,
      originalDurationSec: totalSeconds,
    };

    // Add clip to track immediately (shows waveform)
    setTracks(prev => prev.map(t =>
      t.id === target.trackId ? { ...t, clips: [...(t.clips || []), newClip] } : t
    ));

    // Create audio element for playback
    const audioEl = new Audio(vocalUrl);
    clipAudioMapRef.current.set(clipId, audioEl);

    setStatusMessage(`Processing ${totalSeconds.toFixed(1)}s of audio...`);
    await processClipAudio(wavFile, target.trackId, target.instrument, clipId);
  };

  // Process a clip through the backend (MIDI conversion or raw audio)
  const processClipAudio = async (file: File, trackId: string, instrument: InstrumentType, clipId: string) => {
    const isRawAudio = instrument === InstrumentType.RAW_AUDIO;

    setIsProcessing(true);
    setError(null);
    setStatusMessage(isRawAudio ? 'Storing raw audio...' : 'Converting vocal to MIDI...');

    try {
      console.log(`[Sinatra] Processing clip ${clipId} for track ${trackId}: ${file.size} bytes, instrument: ${instrument}`);
      const uploadResult = await uploadVocal(file, isRawAudio, {
        key: musicalKey,
        scale: scaleType,
        quantize,
      });

      if (isRawAudio) {
        // Raw audio — clip already has the correct audioUrl
        setTracks(prev => prev.map(t =>
          t.id === trackId ? { ...t, name: `Raw Audio (Track ${trackId})` } : t
        ));
        setStatusMessage('Done! Raw audio ready.');
      } else {
        // MIDI mode: render with instrument
        setStatusMessage(`Rendering with ${instrument}...`);
        const audioBlob = await renderMidi(instrument);
        console.log(`[Sinatra] Rendered audio: ${audioBlob.size} bytes`);
        const renderedUrl = URL.createObjectURL(audioBlob);

        // Store midiFilename in the clip so it can be re-rendered with different instruments
        const midiFilename = uploadResult.midi_filename || undefined;

        // Update clip's audioUrl with rendered audio + store midiFilename
        setTracks(prev => prev.map(t => {
          if (t.id !== trackId) return t;
          const updatedClips = (t.clips || []).map(c =>
            c.id === clipId ? { ...c, audioUrl: renderedUrl, midiFilename } : c
          );
          return { ...t, clips: updatedClips, name: `${instrument} (Track ${trackId})` };
        }));

        // Update audio element
        const audioEl = clipAudioMapRef.current.get(clipId);
        if (audioEl) {
          audioEl.src = renderedUrl;
        } else {
          clipAudioMapRef.current.set(clipId, new Audio(renderedUrl));
        }

        setStatusMessage(`Done! Track ${trackId} ready.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Processing failed';
      console.error('[Sinatra] Clip processing error:', msg);
      setError(msg);
      setStatusMessage('Error');
    } finally {
      setIsProcessing(false);
    }
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
      const drumTrack = tracks.find(t => t.id === '1');
      if (drumTrack) {
        el.volume = drumTrack.volume * masterVolume;
      }
      el.addEventListener('loadedmetadata', () => {
        setTracks(prev => prev.map(t =>
          t.id === '1' ? { ...t, name: `Drum Loop (${res.bpm} BPM)`, audioUrl: drumAudioUrlRef.current || undefined, audioDuration: el.duration } : t
        ));
      });
      drumAudioElRef.current = el;

      setStatusMessage(`BPM: ${res.bpm} ΓÇö drum loop ready. Hit + to add a track, then record!`);
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

  const handleSampleUpload = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setStatusMessage('Uploading one-shot sample...');
    try {
      const res = await uploadSample(file);
      setSampleName(file.name);
      setSampleNote(res.note_name);
      setStatusMessage(`Sample loaded! Base pitch: ${res.note_name}. Record a melody to use it.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sample upload failed';
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

      if (drumAudioElRef.current) drumAudioElRef.current.pause();
      pauseClipPlayback();
    } else {
      // ---- PLAY from current playheadSec ----
      setIsPlaying(true);
      startTransport(playheadSec);

      // Start metronome if enabled
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
        drumAudioElRef.current.volume = drumTrack.volume * masterVolume;
        drumAudioElRef.current.play().catch(() => {});
      }

      // Play all clips
      scheduleClipPlayback(playheadSec);
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
    stopClipPlayback();
  };

  // ==============================
  //  CLIP MANAGEMENT
  // ==============================
  const handleSelectClip = useCallback((clipId: string | null) => {
    setSelectedClipId(clipId);
  }, []);

  const handleDeleteClip = useCallback(() => {
    if (!selectedClipId) return;

    // Find and remove clip from its track
    setTracks(prev => prev.map(t => ({
      ...t,
      clips: (t.clips || []).filter(c => c.id !== selectedClipId),
    })));

    // Cleanup audio element
    const el = clipAudioMapRef.current.get(selectedClipId);
    if (el) {
      el.pause();
      el.src = '';
      clipAudioMapRef.current.delete(selectedClipId);
    }

    setSelectedClipId(null);
  }, [selectedClipId]);

  const handleUpdateClip = useCallback((trackId: string, clipId: string, updates: Partial<Clip>) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        clips: (t.clips || []).map(c =>
          c.id === clipId ? { ...c, ...updates } : c
        ),
      };
    }));
  }, []);

  const handleMoveClipBetweenTracks = useCallback(async (sourceTrackId: string, destTrackId: string, clipId: string, newStartSec: number) => {
    console.log(`[Sinatra] Moving clip ${clipId} from track ${sourceTrackId} to track ${destTrackId}`);

    // Snapshot info before modifying state
    const currentTracks = tracks;
    const sourceTrack = currentTracks.find(t => t.id === sourceTrackId);
    const destTrack = currentTracks.find(t => t.id === destTrackId);
    const clip = sourceTrack?.clips?.find(c => c.id === clipId);
    if (!clip || !sourceTrack || !destTrack) return;

    const sourceInstrument = sourceTrack.instrument;
    const destInstrument = destTrack.instrument;
    const instrumentChanged = sourceInstrument !== destInstrument;

    // Move the clip between tracks immediately (for snappy UI)
    const movedClip: Clip = { ...clip, startSec: Math.max(0, newStartSec) };
    setTracks(prev => prev.map(t => {
      if (t.id === sourceTrackId) return { ...t, clips: (t.clips || []).filter(c => c.id !== clipId) };
      if (t.id === destTrackId) return { ...t, clips: [...(t.clips || []), movedClip] };
      return t;
    }));

    // If the instrument changed and the clip has a MIDI file, re-render it
    if (instrumentChanged && clip.midiFilename && destInstrument && destInstrument !== InstrumentType.RAW_AUDIO) {
      setIsProcessing(true);
      setStatusMessage(`Re-rendering clip for ${destInstrument}...`);
      try {
        const audioBlob = await reRenderMidi(clip.midiFilename, destInstrument);
        const renderedUrl = URL.createObjectURL(audioBlob);

        // Update the clip's audio in the destination track
        setTracks(prev => prev.map(t => {
          if (t.id !== destTrackId) return t;
          const updatedClips = (t.clips || []).map(c =>
            c.id === clipId ? { ...c, audioUrl: renderedUrl } : c
          );
          return { ...t, clips: updatedClips };
        }));

        // Update audio element
        const audioEl = clipAudioMapRef.current.get(clipId);
        if (audioEl) {
          audioEl.src = renderedUrl;
        } else {
          clipAudioMapRef.current.set(clipId, new Audio(renderedUrl));
        }

        setStatusMessage(`Clip re-rendered for ${destInstrument}.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Re-rendering failed';
        console.error('[Sinatra] Re-render error:', msg);
        setError(msg);
        setStatusMessage('Clip moved but re-rendering failed');
      } finally {
        setIsProcessing(false);
      }
    }
  }, [tracks]);

  // ==============================
  //  UNDO/REDO
  // ==============================
  const saveToHistory = useCallback((newTracks: TrackData[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newTracks))); // Deep clone
      // Limit history to 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoRef.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const restoredTracks = JSON.parse(JSON.stringify(history[newIndex])); // Deep clone
      prevTracksRef.current = restoredTracks;
      setTracks(restoredTracks);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoRef.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const restoredTracks = JSON.parse(JSON.stringify(history[newIndex])); // Deep clone
      prevTracksRef.current = restoredTracks;
      setTracks(restoredTracks);
    }
  }, [historyIndex, history]);

  // Save to history when tracks change (but not from undo/redo)
  const isUndoRedoRef = useRef(false);
  const prevTracksRef = useRef<TrackData[]>(tracks);
  useEffect(() => {
    // Only save if tracks actually changed and it's not from undo/redo
    if (!isUndoRedoRef.current && JSON.stringify(prevTracksRef.current) !== JSON.stringify(tracks)) {
      saveToHistory(tracks);
      prevTracksRef.current = tracks;
    }
    isUndoRedoRef.current = false;
  }, [tracks, saveToHistory]);

  // Keyboard listener for backspace/delete to delete selected clip, undo/redo, and spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      // Ctrl+Z: Undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (!isInput) {
          isUndoRedoRef.current = true;
          handleUndo();
        }
        return;
      }
      
      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        if (!isInput) {
          isUndoRedoRef.current = true;
          handleRedo();
        }
        return;
      }
      
      // Spacebar: Play/Pause
      if (e.key === ' ' && !isInput) {
        e.preventDefault();
        handlePlayToggle();
        return;
      }
      
      // Backspace/Delete: Delete selected clip
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (isInput) return;
        if (selectedClipId) {
          e.preventDefault();
          handleDeleteClip();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, handleDeleteClip, handleUndo, handleRedo, handlePlayToggle]);

  // ==============================
  //  TRACK DELETE & UPDATE
  // ==============================
  const handleDeleteTrack = (id: string) => {
    if (id === '1') return;

    // Cleanup clips' audio elements
    const track = tracks.find(t => t.id === id);
    if (track?.clips) {
      track.clips.forEach(clip => {
        const el = clipAudioMapRef.current.get(clip.id);
        if (el) {
          el.pause();
          el.src = '';
          clipAudioMapRef.current.delete(clip.id);
        }
      });
    }

    setTracks(prev => prev.filter(t => t.id !== id));
    if (selectedTrackId === id) {
      setSelectedTrackId('1');
    }
  };

  const handleUpdateTrack = (id: string, updates: Partial<TrackData>) => {
    setTracks(prev => {
      // If instrument is being changed, auto-update the track name
      if (updates.instrument !== undefined) {
        const track = prev.find(t => t.id === id);
        if (track && !updates.name) {
          updates.name = `${updates.instrument} (Track ${id})`;
        }
      }

      // Handle mute/unmute with volume changes
      if (updates.isMuted !== undefined) {
        const currentTrack = prev.find(t => t.id === id);
        if (currentTrack) {
          if (updates.isMuted) {
            const unmutedVol = currentTrack.volume > 0 ? currentTrack.volume : (currentTrack.unmutedVolume ?? 0.8);
            updates.volume = 0;
            updates.unmutedVolume = unmutedVol;
          } else {
            updates.volume = currentTrack.unmutedVolume ?? 0.8;
            updates.unmutedVolume = undefined;
          }
        }
      }

      const updated = prev.map(t => t.id === id ? { ...t, ...updates } : t);

      // Apply mute/unmute in real-time if playing
      if (updates.isMuted !== undefined) {
        const track = updated.find(t => t.id === id);
        if (track) {
          if (id === '1') {
            if (drumAudioElRef.current) {
              if (track.isMuted) {
                drumAudioElRef.current.pause();
              } else if (isPlaying) {
                if (drumAudioElRef.current.duration) {
                  drumAudioElRef.current.currentTime = playheadSec % drumAudioElRef.current.duration;
                }
                drumAudioElRef.current.volume = track.volume * masterVolume;
                drumAudioElRef.current.play().catch(() => {});
              }
            }
          } else if (track.clips) {
            // Mute/unmute clips
            track.clips.forEach(clip => {
              const el = clipAudioMapRef.current.get(clip.id);
              if (el) {
                if (track.isMuted) {
                  el.pause();
                } else if (isPlaying) {
                  const currentSec = playheadStartSecRef.current + (performance.now() - transportStartRef.current) / 1000;
                  const clipEnd = clip.startSec + clip.durationSec;
                  if (currentSec >= clip.startSec && currentSec < clipEnd) {
                    el.currentTime = (clip.offsetSec || 0) + (currentSec - clip.startSec);
                    el.volume = track.volume * masterVolume;
                    el.play().catch(() => {});
                  }
                }
              }
            });
          }
        }
      }

      // Apply volume changes in real-time
      if (updates.volume !== undefined) {
        const track = updated.find(t => t.id === id);
        if (track && !track.isMuted) {
          if (id === '1') {
            if (drumAudioElRef.current) {
              drumAudioElRef.current.volume = updates.volume * masterVolume;
            }
          } else if (track.clips) {
            track.clips.forEach(clip => {
              const el = clipAudioMapRef.current.get(clip.id);
              if (el) el.volume = updates.volume! * masterVolume;
            });
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
  //  EXPORT
  // ==============================
  const handleExport = async () => {
    try {
      setStatusMessage('Exporting...');
      // Find tracks with clips
      const tracksWithClips = tracks.filter(t => t.clips && t.clips.length > 0);
      if (tracksWithClips.length === 0) {
        setError('No tracks to export');
        return;
      }

      // Export first clip of first track (simplified)
      const firstClip = tracksWithClips[0].clips![0];
      if (firstClip?.audioUrl) {
        const response = await fetch(firstClip.audioUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sinatra-export-${Date.now()}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatusMessage('Export complete');
      }
    } catch (err) {
      setError('Export failed');
      setStatusMessage('Error');
    }
  };

  // ==============================
  //  CHAT ACTION HANDLER
  // ==============================
  const handleChatAction = useCallback((action: ChatAction) => {
    console.log('[Sinatra] Chat action:', action);
    
    switch (action.type) {
      case 'ADD_TRACK': {
        const newId = addTrack();
        if (action.instrument) {
          const inst = action.instrument as InstrumentType;
          setTracks(prev => prev.map(t =>
            t.id === newId ? { ...t, instrument: inst, name: `${inst} (Track ${newId})` } : t
          ));
        }
        break;
      }
      case 'SET_BPM': {
        if (action.value && action.value >= 60 && action.value <= 200) {
          setBpm(action.value);
        }
        break;
      }
      case 'CHANGE_INSTRUMENT': {
        if (action.instrument) {
          handleInstrumentChange(action.instrument as InstrumentType);
        }
        break;
      }
      case 'TRANSPORT': {
        if (action.command === 'play' && !isPlaying) {
          handlePlayToggle();
        } else if (action.command === 'stop') {
          handleStop();
        } else if (action.command === 'record' && !isRecording) {
          handleRecordToggle();
        } else if (action.command === 'pause' && isPlaying) {
          handlePlayToggle();
        }
        break;
      }
      case 'SET_KEY': {
        if (action.key && MUSICAL_KEYS.includes(action.key as MusicalKey)) {
          setMusicalKey(action.key as MusicalKey);
        }
        break;
      }
      case 'SET_SCALE': {
        if (action.scale && SCALE_TYPES.includes(action.scale as ScaleType)) {
          setScaleType(action.scale as ScaleType);
        }
        break;
      }
      case 'SET_QUANTIZE': {
        if (action.quantize && QUANTIZE_OPTIONS.includes(action.quantize as QuantizeOption)) {
          setQuantize(action.quantize as QuantizeOption);
        }
        break;
      }
      case 'GENERATE_CHORDS': {
        if (action.chords && action.chords.length > 0) {
          // Run async chord generation
          (async () => {
            try {
              const instrument = action.instrument || 'Piano';
              setStatusMessage(`Generating ${action.chords!.join(' → ')} on ${instrument}...`);
              setIsProcessing(true);

              // Create a new track for the chords
              const newId = addTrack();
              setTracks(prev => prev.map(t =>
                t.id === newId ? { ...t, instrument: instrument as InstrumentType, name: `${instrument} Chords (Track ${newId})` } : t
              ));

              // Call backend to generate chord audio
              const audioBlob = await generateChords({
                chords: action.chords!,
                bpm,
                beats_per_chord: action.beats_per_chord || 4,
                instrument,
                octave_shift: action.octave_shift || 0,
                velocity: action.velocity || 80,
                pattern: action.pattern || 'block',
              });

              console.log(`[Sinatra] Chord audio received: ${audioBlob.size} bytes`);
              const audioUrl = URL.createObjectURL(audioBlob);

              // Get audio duration
              const tempAudio = new Audio(audioUrl);
              await new Promise<void>((resolve) => {
                tempAudio.onloadedmetadata = () => resolve();
                tempAudio.onerror = () => resolve();
              });
              const duration = tempAudio.duration || (action.chords!.length * (action.beats_per_chord || 4) * 60 / bpm);

              // Create a clip on the new track
              const clipId = `clip-chord-${Date.now()}-${nextClipIdRef.current++}`;
              const newClip: Clip = {
                id: clipId,
                startSec: 0,
                durationSec: duration,
                audioUrl,
                offsetSec: 0,
                originalDurationSec: duration,
              };

              setTracks(prev => prev.map(t =>
                t.id === newId ? { ...t, clips: [...(t.clips || []), newClip] } : t
              ));

              // Register audio element for playback
              const audioEl = new Audio(audioUrl);
              clipAudioMapRef.current.set(clipId, audioEl);

              setStatusMessage(`Chords ready on Track ${newId}!`);
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Chord generation failed';
              console.error('[Sinatra] Chord generation error:', msg);
              setError(msg);
              setStatusMessage('Error');
            } finally {
              setIsProcessing(false);
            }
          })();
        }
        break;
      }
    }
  }, [addTrack, handleInstrumentChange, handlePlayToggle, handleStop, handleRecordToggle, isPlaying, isRecording, setMusicalKey, setScaleType, setQuantize, bpm]);

  // Calculate project stats
  const totalDuration = Math.max(
    ...tracks.map(t => {
      if (t.clips && t.clips.length > 0) {
        return Math.max(...t.clips.map(c => c.startSec + c.durationSec));
      }
      return t.audioDuration || 0;
    }),
    0
  );

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
        masterVolume={masterVolume}
        onMasterVolumeChange={setMasterVolume}
        onExport={handleExport}
      />

      <div className="flex flex-1 overflow-hidden">
        <SidebarLeft
          selectedInstrument={selectedInstrument}
          onInstrumentChange={handleInstrumentChange}
          isRecording={isRecording}
          onRecordStart={handleRecordToggle}
          onDrumUpload={handleDrumUpload}
          onSampleUpload={handleSampleUpload}
          onAddTrack={addTrack}
          selectedTrackName={selectedTrack?.name || 'None'}
          isDrumSelected={selectedTrackId === '1'}
          totalDuration={totalDuration}
          sampleName={sampleName}
          sampleNote={sampleNote}
          musicalKey={musicalKey}
          scaleType={scaleType}
          quantize={quantize}
          onKeyChange={setMusicalKey}
          onScaleChange={setScaleType}
          onQuantizeChange={setQuantize}
        />

        <div className="flex-1 overflow-hidden min-w-0">
          <Timeline
            playheadSec={playheadSec}
            tracks={tracks}
            notes={notes}
            selectedTrackId={selectedTrackId}
            selectedClipId={selectedClipId}
            isPlaying={isPlaying}
            onSelectTrack={handleSelectTrack}
            onUpdateTrack={handleUpdateTrack}
            onAddTrack={addTrack}
            onDeleteTrack={handleDeleteTrack}
            onSeek={handleSeek}
            onSelectClip={handleSelectClip}
            onUpdateClip={handleUpdateClip}
            onMoveClipToTrack={handleMoveClipBetweenTracks}
          />
        </div>

        <Chatbot
          width={chatbotWidth}
          onWidthChange={setChatbotWidth}
          projectContext={{
            bpm,
            isPlaying,
            isRecording,
            selectedInstrument,
            key: musicalKey,
            scale: scaleType,
            quantize,
            tracks: tracks.map(t => ({
              id: t.id,
              name: t.name,
              instrument: t.instrument,
              isMuted: t.isMuted,
            })),
          }}
          onAction={handleChatAction}
        />
      </div>

      <Terminal
        isRecording={isRecording}
        audioLevels={audioLevels}
        height={terminalHeight}
        onHeightChange={setTerminalHeight}
        recordingSessions={recordingSessions}
        currentPeakLevel={currentPeakLevel}
        currentAvgLevel={currentAvgLevel}
      />
    </div>
  );
};

export default DAWEditor;