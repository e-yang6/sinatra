import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, StopCircle, Film, CheckCircle, Loader2 } from 'lucide-react';
import NCSVisualizer, { THEME_NAMES } from './NCSVisualizer';
import { TrackData } from '../types';

// ---- Helpers ----
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---- Props ----
interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: TrackData[];
  clipAudioMap: Map<string, HTMLAudioElement>;
  drumAudioEl: HTMLAudioElement | null;
  bpm: number;
  masterVolume: number;
  projectTitle?: string;
}

type RenderPhase = 'idle' | 'preparing' | 'recording' | 'done';

const VideoExportModal: React.FC<VideoExportModalProps> = ({
  isOpen,
  onClose,
  tracks,
  clipAudioMap,
  drumAudioEl,
  bpm,
  masterVolume,
  projectTitle = 'My Track',
}) => {
  // ---- Form state ----
  const [songTitle, setSongTitle] = useState(projectTitle);
  const [selectedTheme, setSelectedTheme] = useState('Happy');
  const [exportType, setExportType] = useState<'video' | 'audio'>('video');

  // ---- Recording state ----
  const [phase, setPhase] = useState<RenderPhase>('idle');
  const [overallPercent, setOverallPercent] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [renderError, setRenderError] = useState<string | null>(null);

  // ---- Analyser as STATE so NCSVisualizer re-renders when set ----
  const [activeAnalyser, setActiveAnalyser] = useState<AnalyserNode | null>(null);

  // ---- Refs ----
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedBlobsRef = useRef<Blob[]>([]);
  const renderCancelledRef = useRef(false);
  const renderIntervalRef = useRef<number>(0);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);

  // Compute total project duration from clips
  const totalDuration = Math.max(
    ...tracks.map(t => {
      if (t.clips && t.clips.length > 0) {
        return Math.max(...t.clips.map(c => c.startSec + c.durationSec));
      }
      return t.audioDuration || 0;
    }),
    0
  );

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Reset analyser when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveAnalyser(null);
    }
  }, [isOpen]);

  // Update songTitle when projectTitle changes
  useEffect(() => {
    if (projectTitle) {
      setSongTitle(projectTitle);
    }
  }, [projectTitle]);

  // ---- Cleanup helper ----
  const cleanup = useCallback(() => {
    clearInterval(renderIntervalRef.current);
    // Stop all AudioBufferSourceNodes
    sourceNodesRef.current.forEach(node => {
      try { node.stop(); } catch { /* already stopped */ }
    });
    sourceNodesRef.current = [];
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    setActiveAnalyser(null);
    audioCtxRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  // ---- Download the recorded video ----
  const downloadVideo = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // ---- Download audio file ----
  const downloadAudio = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // ---- Fetch and decode an audio URL into an AudioBuffer ----
  const decodeAudioUrl = async (audioCtx: AudioContext, url: string): Promise<AudioBuffer> => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
  };

  // ---- Start rendering ----
  const startRender = useCallback(async () => {
    setRenderError(null);

    // Gather audio sources
    const hasDrum = !!drumAudioEl?.src;
    const drumTrack = tracks.find(t => t.id === '1');
    const hasClips = tracks.some(t => t.id !== '1' && !t.isMuted && t.clips && t.clips.length > 0);

    if (!hasClips && !hasDrum) {
      setRenderError('No audio loaded. Record or upload audio first.');
      return;
    }
    if (totalDuration <= 0) {
      setRenderError('Project has no duration. Add some audio first.');
      return;
    }

    renderCancelledRef.current = false;
    setPhase('preparing');
    setOverallPercent(0);
    setPhaseLabel('Preparing audio...');
    recordedBlobsRef.current = [];

    try {
      // 1. Create AudioContext and audio graph
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const dest = audioCtx.createMediaStreamDestination();

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.75;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      const masterGain = audioCtx.createGain();
      masterGain.gain.value = masterVolume;
      masterGain.connect(analyser);
      analyser.connect(dest);
      // Also play through speakers so user hears during rendering
      analyser.connect(audioCtx.destination);

      // Set analyser as state to trigger NCSVisualizer re-render
      setActiveAnalyser(analyser);

      // 2. Fetch & decode all audio into AudioBuffers
      const sourceNodes: AudioBufferSourceNode[] = [];
      let decoded = 0;

      // Collect all audio jobs
      interface AudioJob {
        url: string;
        volume: number;
        startSec: number;
        offsetSec: number;
        durationSec: number;
        loop: boolean;
      }
      const jobs: AudioJob[] = [];

      // Drum track
      if (hasDrum && drumTrack && !drumTrack.isMuted) {
        jobs.push({
          url: drumAudioEl!.src,
          volume: drumTrack.volume,
          startSec: 0,
          offsetSec: 0,
          durationSec: totalDuration,
          loop: true,
        });
      }

      // All clip tracks
      tracks.forEach(track => {
        if (track.id === '1' || track.isMuted || !track.clips) return;
        track.clips.forEach(clip => {
          const el = clipAudioMap.get(clip.id);
          if (!el?.src) return;
          jobs.push({
            url: el.src,
            volume: track.volume,
            startSec: clip.startSec,
            offsetSec: clip.offsetSec || 0,
            durationSec: clip.durationSec,
            loop: false,
          });
        });
      });

      if (jobs.length === 0) {
        setRenderError('No audio sources found. Make sure your tracks have audio clips.');
        setPhase('idle');
        setOverallPercent(0);
        audioCtx.close();
        return;
      }

      // Decode all in parallel
      const totalJobs = jobs.length;
      setPhaseLabel(`Decoding audio (0/${totalJobs})...`);

      const decodedBuffers = await Promise.all(
        jobs.map(async (job) => {
          const buffer = await decodeAudioUrl(audioCtx, job.url);
          decoded++;
          setPhaseLabel(`Decoding audio (${decoded}/${totalJobs})...`);
          setOverallPercent(Math.round((decoded / totalJobs) * 10)); // 0-10% for decoding
          return { ...job, buffer };
        })
      );

      if (renderCancelledRef.current) {
        cleanup();
        setPhase('idle');
        setOverallPercent(0);
        return;
      }

      // 3. Schedule all AudioBufferSourceNodes
      // We'll start all of them relative to audioCtx.currentTime
      const baseTime = audioCtx.currentTime + 0.1; // tiny delay to ensure everything is ready

      for (const item of decodedBuffers) {
        const sourceNode = audioCtx.createBufferSource();
        sourceNode.buffer = item.buffer;
        sourceNode.loop = item.loop;

        const gainNode = audioCtx.createGain();
        gainNode.gain.value = item.volume;
        sourceNode.connect(gainNode);
        gainNode.connect(masterGain);

        // Start at the right time with the right offset
        const when = baseTime + item.startSec;
        if (item.loop) {
          sourceNode.loopStart = 0;
          sourceNode.loopEnd = item.buffer.duration;
          sourceNode.start(when, 0);
          // Stop the loop when the project ends
          sourceNode.stop(baseTime + totalDuration + 0.5);
        } else {
          sourceNode.start(when, item.offsetSec, item.durationSec);
        }

        sourceNodes.push(sourceNode);
      }

      sourceNodesRef.current = sourceNodes;

      // 4. Canvas stream at 30fps
      const canvas = previewCanvasRef.current;
      if (!canvas) throw new Error('Canvas not found');
      const canvasStream = canvas.captureStream(30);

      // 5. Combined stream (video + audio from MediaStreamDestination)
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      // 6. MediaRecorder
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp9,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2_500_000,
      });
      mediaRecorderRef.current = recorder;

      const safeName = songTitle.replace(/[^a-zA-Z0-9_ -]/g, '') || 'sinatra-export';

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedBlobsRef.current.push(e.data);
      };

      recorder.onstop = () => {
        if (renderCancelledRef.current) {
          cleanup();
          setPhase('idle');
          setOverallPercent(0);
          return;
        }
        const videoBlob = new Blob(recordedBlobsRef.current, { type: mimeType });
        cleanup();

        // Download immediately
        downloadVideo(videoBlob, safeName);

        setOverallPercent(100);
        setPhaseLabel('Done!');
        setPhase('done');
        setTimeout(() => {
          setPhase('idle');
          setOverallPercent(0);
        }, 3000);
      };

      recorder.onerror = () => {
        setRenderError('Recording failed. Try a different browser.');
        cleanup();
        setPhase('idle');
        setOverallPercent(0);
      };

      // 7. Start recording after the tiny delay so audio sources are playing
      const recorderStartDelay = 0.1; // match the baseTime delay
      setTimeout(() => {
        if (renderCancelledRef.current) return;
        recorder.start(200);

        setPhase('recording');
        setOverallPercent(10);
        setPhaseLabel('Recording video & audio...');

        // Progress timer: 10% to 99%
        const startTime = performance.now();
        renderIntervalRef.current = window.setInterval(() => {
          const elapsed = (performance.now() - startTime) / 1000;
          const pct = 10 + Math.min(89, Math.round((elapsed / totalDuration) * 89));
          setOverallPercent(pct);
          setPhaseLabel(`Recording... ${formatTime(elapsed)} / ${formatTime(totalDuration)}`);

          if (elapsed >= totalDuration + 0.5) {
            clearInterval(renderIntervalRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
          }
        }, 100);
      }, recorderStartDelay * 1000);

    } catch (err) {
      console.error('[Sinatra] Render error:', err);
      const msg = err instanceof Error ? err.message : 'Render failed';
      setRenderError(msg);
      cleanup();
      setPhase('idle');
      setOverallPercent(0);
    }
  }, [tracks, clipAudioMap, drumAudioEl, masterVolume, totalDuration, songTitle, cleanup, downloadVideo]);

  // ---- Audio-only export ----
  const startAudioRender = useCallback(async () => {
    setRenderError(null);

    const hasDrum = !!drumAudioEl?.src;
    const drumTrack = tracks.find(t => t.id === '1');
    const hasClips = tracks.some(t => t.id !== '1' && !t.isMuted && t.clips && t.clips.length > 0);

    if (!hasClips && !hasDrum) {
      setRenderError('No audio loaded. Record or upload audio first.');
      return;
    }
    if (totalDuration <= 0) {
      setRenderError('Project has no duration. Add some audio first.');
      return;
    }

    renderCancelledRef.current = false;
    setPhase('preparing');
    setOverallPercent(0);
    setPhaseLabel('Preparing audio...');

    try {
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const masterGain = audioCtx.createGain();
      masterGain.gain.value = masterVolume;

      // Collect all audio jobs
      interface AudioJob {
        url: string;
        volume: number;
        startSec: number;
        offsetSec: number;
        durationSec: number;
        loop: boolean;
      }
      const jobs: AudioJob[] = [];

      // Drum track
      if (hasDrum && drumTrack && !drumTrack.isMuted) {
        jobs.push({
          url: drumAudioEl!.src,
          volume: drumTrack.volume,
          startSec: 0,
          offsetSec: 0,
          durationSec: totalDuration,
          loop: true,
        });
      }

      // All clip tracks
      tracks.forEach(track => {
        if (track.id === '1' || track.isMuted || !track.clips) return;
        track.clips.forEach(clip => {
          const el = clipAudioMap.get(clip.id);
          if (!el?.src) return;
          jobs.push({
            url: el.src,
            volume: track.volume,
            startSec: clip.startSec,
            offsetSec: clip.offsetSec || 0,
            durationSec: clip.durationSec,
            loop: false,
          });
        });
      });

      if (jobs.length === 0) {
        setRenderError('No audio sources found. Make sure your tracks have audio clips.');
        setPhase('idle');
        setOverallPercent(0);
        audioCtx.close();
        return;
      }

      // Decode all in parallel
      const totalJobs = jobs.length;
      setPhaseLabel(`Decoding audio (0/${totalJobs})...`);

      const decodedBuffers = await Promise.all(
        jobs.map(async (job, idx) => {
          const buffer = await decodeAudioUrl(audioCtx, job.url);
          setPhaseLabel(`Decoding audio (${idx + 1}/${totalJobs})...`);
          setOverallPercent(Math.round(((idx + 1) / totalJobs) * 20));
          return { ...job, buffer };
        })
      );

      if (renderCancelledRef.current) {
        cleanup();
        setPhase('idle');
        setOverallPercent(0);
        return;
      }

      // Create offline context for rendering
      const sampleRate = audioCtx.sampleRate;
      const totalSamples = Math.ceil(totalDuration * sampleRate);
      const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);
      const offlineMasterGain = offlineCtx.createGain();
      offlineMasterGain.gain.value = masterVolume;
      offlineMasterGain.connect(offlineCtx.destination);

      // Schedule all sources
      const baseTime = 0.1;
      for (const item of decodedBuffers) {
        const sourceNode = offlineCtx.createBufferSource();
        sourceNode.buffer = item.buffer;
        sourceNode.loop = item.loop;

        const gainNode = offlineCtx.createGain();
        gainNode.gain.value = item.volume;
        sourceNode.connect(gainNode);
        gainNode.connect(offlineMasterGain);

        const when = baseTime + item.startSec;
        if (item.loop) {
          sourceNode.loopStart = 0;
          sourceNode.loopEnd = item.buffer.duration;
          sourceNode.start(when, 0);
          sourceNode.stop(baseTime + totalDuration + 0.5);
        } else {
          sourceNode.start(when, item.offsetSec, item.durationSec);
        }
      }

      setPhase('recording');
      setOverallPercent(30);
      setPhaseLabel('Rendering audio...');

      // Render to audio buffer
      const renderedBuffer = await offlineCtx.startRendering();
      const audioData = renderedBuffer.getChannelData(0);

      // Convert to WAV
      const wavBlob = encodeWav(audioData, sampleRate);
      const safeName = songTitle.replace(/[^a-zA-Z0-9_ -]/g, '') || 'sinatra-export';
      downloadAudio(wavBlob, safeName);

      cleanup();
      setOverallPercent(100);
      setPhaseLabel('Done!');
      setPhase('done');
      setTimeout(() => {
        setPhase('idle');
        setOverallPercent(0);
      }, 3000);

    } catch (err) {
      console.error('[Sinatra] Audio render error:', err);
      const msg = err instanceof Error ? err.message : 'Audio render failed';
      setRenderError(msg);
      cleanup();
      setPhase('idle');
      setOverallPercent(0);
    }
  }, [tracks, clipAudioMap, drumAudioEl, masterVolume, totalDuration, songTitle, cleanup, downloadAudio]);

  // WAV encoding helper
  const encodeWav = (samples: Float32Array, sampleRate: number): Blob => {
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
  };

  const cancelRender = useCallback(() => {
    renderCancelledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setPhase('idle');
    setOverallPercent(0);
  }, [cleanup]);

  const handleClose = useCallback(() => {
    if (phase === 'recording' || phase === 'preparing') cancelRender();
    onClose();
  }, [phase, cancelRender, onClose]);

  if (!isOpen) return null;

  const isWorking = phase === 'preparing' || phase === 'recording';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-[720px] max-w-[95vw] max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Film size={18} className="text-[#6993cf]" />
            <h2 className="text-base font-semibold text-zinc-100">Export</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Song Title */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Song Title</label>
            <input
              type="text"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              placeholder="Enter song title..."
              disabled={isWorking}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#6993cf]/50 focus:ring-1 focus:ring-[#6993cf]/20 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Export Type */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Export Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => !isWorking && setExportType('video')}
                disabled={isWorking}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                  exportType === 'video'
                    ? 'bg-[#6993cf]/15 border-[#6993cf]/40 text-[#6993cf]'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Video (with Visualizer)
              </button>
              <button
                onClick={() => !isWorking && setExportType('audio')}
                disabled={isWorking}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                  exportType === 'audio'
                    ? 'bg-[#6993cf]/15 border-[#6993cf]/40 text-[#6993cf]'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Audio Only
              </button>
            </div>
          </div>

          {/* Theme Select - only show for video */}
          {exportType === 'video' && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Vibe / Theme</label>
            <div className="flex gap-2">
              {THEME_NAMES.map(name => (
                <button
                  key={name}
                  onClick={() => !isWorking && setSelectedTheme(name)}
                  disabled={isWorking}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    selectedTheme === name
                      ? 'bg-[#6993cf]/15 border-[#6993cf]/40 text-[#6993cf]'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          )}

          {/* Live Preview - only show for video */}
          {exportType === 'video' && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Preview</label>
            <div className="rounded-lg overflow-hidden border border-zinc-800 bg-black aspect-video">
              <NCSVisualizer
                ref={previewCanvasRef}
                songTitle={songTitle}
                theme={selectedTheme}
                analyserNode={activeAnalyser}
                width={1280}
                height={720}
              />
            </div>
            <p className="mt-1 text-[10px] text-zinc-600">
              Your full audio track plays over this visualizer in the exported video.
            </p>
          </div>
          )}

          {/* Error */}
          {renderError && (
            <div className="px-3 py-2 bg-red-950/40 border border-red-800/50 rounded-lg text-xs text-red-400">
              {renderError}
            </div>
          )}

          {/* Progress Bar */}
          {isWorking && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  {phase === 'preparing' ? (
                    <Loader2 size={12} className="animate-spin text-[#6993cf]" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                  {phaseLabel}
                </span>
                <span className="font-mono font-semibold text-zinc-300">
                  {overallPercent}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ease-out ${
                    phase === 'preparing'
                      ? 'bg-[#6993cf]'
                      : 'bg-gradient-to-r from-red-500 to-[#6993cf]'
                  }`}
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Done */}
          {phase === 'done' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-xs text-emerald-400">
              <CheckCircle size={14} />
              Export complete! Your video has been downloaded.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-zinc-800">
          {isWorking ? (
            <button
              onClick={cancelRender}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 rounded-lg text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              <StopCircle size={14} />
              Cancel
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => exportType === 'video' ? startRender() : startAudioRender()}
                className="flex items-center gap-2 px-4 py-2 bg-[#6993cf]/20 hover:bg-[#6993cf]/30 border border-[#6993cf]/40 rounded-lg text-sm text-[#6993cf] hover:text-[#8ba8d9] transition-colors"
              >
                <Download size={14} />
                {exportType === 'video' ? 'Render & Download Video' : 'Render & Download Audio'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoExportModal;
