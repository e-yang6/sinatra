import React, { useState, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { SidebarLeft } from './components/SidebarLeft';
import { Timeline } from './components/Timeline';
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
const BARS_PER_LOOP = 4;
const BEATS_PER_BAR = 4;

const INITIAL_TRACKS: TrackData[] = [
  { id: '1', name: 'Track 1', type: 'audio', volume: 0.8, isMuted: false, isSolo: false },
  { id: '2', name: 'Track 2', type: 'midi', volume: 1.0, isMuted: false, isSolo: false },
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
  const [playheadPos, setPlayheadPos] = useState(0);
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>(InstrumentType.PIANO);
  const [tracks, setTracks] = useState<TrackData[]>(INITIAL_TRACKS);
  const [notes, setNotes] = useState<Note[]>([]);

  // ---- Backend state ----
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [error, setError] = useState<string | null>(null);

  // ---- Audio elements ----
  const renderedAudioRef = useRef<HTMLAudioElement | null>(null);
  const renderedUrlRef = useRef<string | null>(null);
  const drumAudioUrlRef = useRef<string | null>(null);
  const drumAudioElRef = useRef<HTMLAudioElement | null>(null);
  const recordedVocalUrlRef = useRef<string | null>(null); // Original recorded vocal

  // ---- Recording refs ----
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recorderNodeRef = useRef<ScriptProcessorNode | null>(null);
  const recordedChunksRef = useRef<Float32Array[]>([]);

  // ---- Transport refs ----
  const transportStartRef = useRef(0);
  const animFrameRef = useRef(0);
  const metronomeTimerRef = useRef(0);
  const nextBeatRef = useRef(0);

  const getLoopMs = useCallback((currentBpm: number) => {
    return (BARS_PER_LOOP * BEATS_PER_BAR * 60 / currentBpm) * 1000;
  }, []);

  // ==================================
  //  TRANSPORT (playhead)
  // ==================================
  const startTransport = useCallback((currentBpm: number) => {
    transportStartRef.current = performance.now();
    setPlayheadPos(0);
    const loopMs = getLoopMs(currentBpm);
    const tick = () => {
      const elapsed = performance.now() - transportStartRef.current;
      setPlayheadPos(((elapsed % loopMs) / loopMs) * 100);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, [getLoopMs]);

  const stopTransport = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  // ==================================
  //  METRONOME
  // ==================================
  const startMetronome = useCallback((ctx: AudioContext, currentBpm: number) => {
    const beatSec = 60 / currentBpm;
    let beat = 0;
    // Schedule the FIRST click immediately (no delay)
    nextBeatRef.current = ctx.currentTime;

    const scheduler = () => {
      while (nextBeatRef.current < ctx.currentTime + 0.1) {
        scheduleClick(ctx, nextBeatRef.current, beat % BEATS_PER_BAR === 0);
        nextBeatRef.current += beatSec;
        beat++;
      }
    };
    metronomeTimerRef.current = window.setInterval(scheduler, 25);
    scheduler(); // fire right now
  }, []);

  const stopMetronome = useCallback(() => {
    clearInterval(metronomeTimerRef.current);
  }, []);

  // ==================================
  //  DRUM LOOP
  // ==================================
  const startDrumPlayback = useCallback(() => {
    if (!drumAudioUrlRef.current) return;
    if (!drumAudioElRef.current) drumAudioElRef.current = new Audio();
    const el = drumAudioElRef.current;
    el.src = drumAudioUrlRef.current;
    el.loop = true;
    el.currentTime = 0;
    el.play().catch(() => {});
  }, []);

  const stopDrumPlayback = useCallback(() => {
    if (drumAudioElRef.current) {
      drumAudioElRef.current.pause();
      drumAudioElRef.current.currentTime = 0;
    }
  }, []);

  // ==============================
  //  RECORDING
  // ==============================
  const startRecording = async () => {
    try {
      setError(null);
      setStatusMessage('Requesting mic access...');

      // Create AudioContext NOW (inside the click gesture) so it won't be suspended
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      // Explicitly resume in case browser auto-suspended it
      if (ctx.state === 'suspended') await ctx.resume();

      // Now request mic (async, but AudioContext is already alive)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,  // we want raw vocal, no processing
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      mediaStreamRef.current = stream;

      // Wire: mic → highpass → noise gate → ScriptProcessor → destination
      const source = ctx.createMediaStreamSource(stream);

      // High-pass filter at 60Hz — cuts rumble, AC hum
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 60;

      // Low-pass filter at 4000Hz — cuts hiss but keeps vocal overtones
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 4000;

      const processor = ctx.createScriptProcessor(4096, 1, 1);
      recorderNodeRef.current = processor;
      recordedChunksRef.current = [];

      // Noise gate threshold — silence anything below this amplitude
      const NOISE_GATE = 0.005;
      let chunkCount = 0;
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const gated = new Float32Array(input.length);

        // Find peak amplitude in this chunk
        let peak = 0;
        for (let j = 0; j < input.length; j++) {
          peak = Math.max(peak, Math.abs(input[j]));
        }

        // If chunk is above the noise gate, copy it; otherwise silence
        if (peak > NOISE_GATE) {
          gated.set(input);
        }
        // else: gated stays all zeros (silence)

        recordedChunksRef.current.push(gated);
        chunkCount++;
      };

      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(processor);
      processor.connect(ctx.destination); // MUST connect to destination for onaudioprocess to fire

      // ---- Start everything ----
      setIsRecording(true);
      setNotes([]);
      startTransport(bpm);
      startDrumPlayback();
      if (metronome) startMetronome(ctx, bpm);

      console.log('[Sinatra] Recording started. AudioContext state:', ctx.state, 'sampleRate:', ctx.sampleRate);
      setStatusMessage('🎤 Recording — sing along!');
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

    // Disconnect mic graph
    recorderNodeRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());

    const sampleRate = audioCtxRef.current?.sampleRate ?? 44100;
    audioCtxRef.current?.close();

    // Merge chunks
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

    // Check if the audio is actually silent (all zeros = mic not working)
    const maxAmp = merged.reduce((max, s) => Math.max(max, Math.abs(s)), 0);
    console.log(`[Sinatra] Peak amplitude: ${maxAmp.toFixed(4)}`);
    if (maxAmp < 0.001) {
      setError('Recording was silent — make sure your mic is working');
      setStatusMessage('Error');
      return;
    }

    // Encode WAV & send to backend
    setStatusMessage(`Processing ${totalSeconds.toFixed(1)}s of audio...`);
    const wavBlob = encodeWav(merged, sampleRate);
    const wavFile = new File([wavBlob], 'recording.wav', { type: 'audio/wav' });
    console.log(`[Sinatra] WAV blob size: ${wavBlob.size} bytes`);

    await handleVocalUpload(wavFile);
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

      // Store drum audio for playback during recording
      if (drumAudioUrlRef.current) URL.revokeObjectURL(drumAudioUrlRef.current);
      drumAudioUrlRef.current = URL.createObjectURL(file);

      setStatusMessage(`BPM: ${res.bpm} — drum loop ready. Hit ⏺ to record!`);
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

  const handleVocalUpload = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setStatusMessage('Converting vocal to MIDI...');
    
    // Store uploaded vocal audio URL for display
    if (recordedVocalUrlRef.current) URL.revokeObjectURL(recordedVocalUrlRef.current);
    recordedVocalUrlRef.current = URL.createObjectURL(file);
    setTracks(prev => prev.map(t =>
      t.id === '2' ? { ...t, audioUrl: recordedVocalUrlRef.current || undefined } : t
    ));
    
    try {
      console.log(`[Sinatra] Uploading vocal: ${file.size} bytes`);
      await uploadVocal(file);

      setStatusMessage('Rendering with ' + selectedInstrument + '...');
      const audioBlob = await renderMidi(selectedInstrument);
      console.log(`[Sinatra] Rendered audio: ${audioBlob.size} bytes`);

      // Store rendered audio for playback
      if (renderedUrlRef.current) URL.revokeObjectURL(renderedUrlRef.current);
      const url = URL.createObjectURL(audioBlob);
      renderedUrlRef.current = url;

      if (!renderedAudioRef.current) renderedAudioRef.current = new Audio();
      renderedAudioRef.current.src = url;

      setStatusMessage('✅ Done! Press ▶ to play back your recording as ' + selectedInstrument);
      setTracks(prev => prev.map(t =>
        t.id === '2' ? { ...t, name: `Vocal → ${selectedInstrument}` } : t
      ));
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
  const handlePlayToggle = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopTransport();
      stopDrumPlayback();
      renderedAudioRef.current?.pause();
    } else {
      setIsPlaying(true);
      startTransport(bpm);
      startDrumPlayback();

      // Play rendered instrument audio in sync
      if (renderedAudioRef.current?.src) {
        renderedAudioRef.current.currentTime = 0;
        renderedAudioRef.current.play().catch(() => {});
      }
    }
  };

  const handleStop = () => {
    if (isRecording) stopRecording();
    setIsPlaying(false);
    setIsRecording(false);
    stopTransport();
    stopDrumPlayback();
    stopMetronome();
    setPlayheadPos(0);
    if (renderedAudioRef.current) {
      renderedAudioRef.current.pause();
      renderedAudioRef.current.currentTime = 0;
    }
  };

  const handleUpdateTrack = (id: string, updates: Partial<TrackData>) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  // ==============================
  //  RENDER
  // ==============================
  return (
    <div className="h-screen w-screen flex flex-col bg-dark-bg text-white overflow-hidden font-sans selection:bg-accent selection:text-white">
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
          onInstrumentChange={setSelectedInstrument}
          isRecording={isRecording}
          onRecordStart={handleRecordToggle}
          onDrumUpload={handleDrumUpload}
          onVocalUpload={handleVocalUpload}
        />

        <Timeline
          playheadPosition={playheadPos}
          tracks={tracks}
          notes={notes}
          onUpdateTrack={handleUpdateTrack}
        />
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-dark-bg border-t border-dark-border px-4 flex items-center justify-between text-[10px]">
        <div className="text-zinc-600">Sinatra v0.1.0</div>
        <div className={
          error ? 'text-red-400' :
          isRecording ? 'text-red-400 animate-pulse' :
          isProcessing ? 'text-yellow-400 animate-pulse' :
          statusMessage !== 'Ready' ? 'text-green-400' :
          'text-zinc-600'
        }>
          {error || statusMessage}
        </div>
      </div>
    </div>
  );
};

export default App;
