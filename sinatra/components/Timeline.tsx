import React, { useRef, useEffect, useState } from 'react';
import { Track } from './Track';
import { Waveform } from './Waveform';
import { PianoRoll } from './PianoRoll';
import { TrackData, Note, Clip } from '../types';
import { Plus } from 'lucide-react';

const PIXELS_PER_SECOND = 80;
const MIN_TIMELINE_SEC = 30;
const CONTROLS_WIDTH = 128; // w-32 = 8rem
const MIN_CLIP_DURATION = 0.1; // Minimum clip duration in seconds

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface TimelineProps {
  playheadSec: number;
  tracks: TrackData[];
  notes: Note[];
  selectedTrackId: string;
  selectedClipId: string | null;
  isPlaying: boolean;
  onSelectTrack: (id: string) => void;
  onUpdateTrack: (id: string, updates: Partial<TrackData>) => void;
  onAddTrack: () => void;
  onDeleteTrack: (id: string) => void;
  onSeek: (sec: number) => void;
  onSelectClip: (clipId: string | null) => void;
  onUpdateClip: (trackId: string, clipId: string, updates: Partial<Clip>) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  playheadSec,
  tracks,
  notes,
  selectedTrackId,
  selectedClipId,
  isPlaying,
  onSelectTrack,
  onUpdateTrack,
  onAddTrack,
  onDeleteTrack,
  onSeek,
  onSelectClip,
  onUpdateClip,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  // Clip drag state (move)
  const [draggingClip, setDraggingClip] = useState<{
    trackId: string;
    clipId: string;
    startX: number;
    originalStartSec: number;
  } | null>(null);

  // Clip resize state
  const [resizingClip, setResizingClip] = useState<{
    trackId: string;
    clipId: string;
    edge: 'left' | 'right';
    startX: number;
    originalStartSec: number;
    originalDurationSec: number;
    originalOffsetSec: number;
    originalFullDuration: number;
  } | null>(null);

  // Calculate timeline width from longest track (including clips)
  const maxDuration = Math.max(
    MIN_TIMELINE_SEC,
    ...tracks.map(t => {
      if (t.clips && t.clips.length > 0) {
        return Math.max(...t.clips.map(c => c.startSec + c.durationSec));
      }
      return t.audioDuration || 0;
    }),
    playheadSec + 10,
  );
  const contentWidthPx = maxDuration * PIXELS_PER_SECOND;

  // Generate ruler marks
  const rulerMarks: number[] = [];
  for (let s = 0; s <= maxDuration; s++) {
    rulerMarks.push(s);
  }

  // Click ruler to seek
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const sec = Math.max(0, x / PIXELS_PER_SECOND);
    onSelectClip(null);
    onSeek(sec);
  };

  // Auto-scroll to keep playhead visible
  useEffect(() => {
    if (!scrollRef.current || !isPlaying || isDraggingPlayhead) return;
    const el = scrollRef.current;
    const playheadPx = playheadSec * PIXELS_PER_SECOND;
    const viewWidth = el.clientWidth - CONTROLS_WIDTH;
    const viewRight = el.scrollLeft + viewWidth;

    if (playheadPx > viewRight - 80 || playheadPx < el.scrollLeft) {
      el.scrollLeft = Math.max(0, playheadPx - 200);
    }
  }, [playheadSec, isPlaying, isDraggingPlayhead]);

  // ---- Playhead dragging ----
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  };

  useEffect(() => {
    if (!isDraggingPlayhead) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!scrollRef.current) return;
      const rect = scrollRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - CONTROLS_WIDTH + scrollRef.current.scrollLeft;
      const sec = Math.max(0, x / PIXELS_PER_SECOND);
      onSeek(sec);
    };

    const handleMouseUp = () => setIsDraggingPlayhead(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, onSeek]);

  // ---- Clip move dragging ----
  const handleClipMouseDown = (e: React.MouseEvent, trackId: string, clip: Clip) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectClip(clip.id);
    setDraggingClip({
      trackId,
      clipId: clip.id,
      startX: e.clientX,
      originalStartSec: clip.startSec,
    });
  };

  useEffect(() => {
    if (!draggingClip) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - draggingClip.startX;
      const dSec = dx / PIXELS_PER_SECOND;
      const newStartSec = Math.max(0, draggingClip.originalStartSec + dSec);
      onUpdateClip(draggingClip.trackId, draggingClip.clipId, { startSec: newStartSec });
    };

    const handleMouseUp = () => setDraggingClip(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingClip, onUpdateClip]);

  // ---- Clip resize dragging ----
  const handleResizeMouseDown = (e: React.MouseEvent, trackId: string, clip: Clip, edge: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    onSelectClip(clip.id);
    setResizingClip({
      trackId,
      clipId: clip.id,
      edge,
      startX: e.clientX,
      originalStartSec: clip.startSec,
      originalDurationSec: clip.durationSec,
      originalOffsetSec: clip.offsetSec || 0,
      originalFullDuration: clip.originalDurationSec || clip.durationSec,
    });
  };

  useEffect(() => {
    if (!resizingClip) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizingClip.startX;
      const dSec = dx / PIXELS_PER_SECOND;

      if (resizingClip.edge === 'right') {
        // Right edge: change duration only
        const maxDuration = resizingClip.originalFullDuration - resizingClip.originalOffsetSec;
        const newDuration = Math.max(MIN_CLIP_DURATION, Math.min(maxDuration, resizingClip.originalDurationSec + dSec));
        onUpdateClip(resizingClip.trackId, resizingClip.clipId, {
          durationSec: newDuration,
        });
      } else {
        // Left edge: change startSec, offsetSec, and durationSec
        // dSec > 0 means dragging right (trimming start)
        // dSec < 0 means dragging left (extending start, if offset allows)
        const maxTrimRight = resizingClip.originalDurationSec - MIN_CLIP_DURATION;
        const maxTrimLeft = resizingClip.originalOffsetSec; // can't go before audio start
        const clampedDSec = Math.max(-maxTrimLeft, Math.min(maxTrimRight, dSec));

        const newStartSec = Math.max(0, resizingClip.originalStartSec + clampedDSec);
        const newOffsetSec = resizingClip.originalOffsetSec + clampedDSec;
        const newDuration = resizingClip.originalDurationSec - clampedDSec;

        onUpdateClip(resizingClip.trackId, resizingClip.clipId, {
          startSec: newStartSec,
          offsetSec: Math.max(0, newOffsetSec),
          durationSec: Math.max(MIN_CLIP_DURATION, newDuration),
        });
      }
    };

    const handleMouseUp = () => setResizingClip(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingClip, onUpdateClip]);

  const playheadPx = playheadSec * PIXELS_PER_SECOND;
  const isAnyDrag = !!draggingClip || !!resizingClip;

  return (
    <div className="flex-1 bg-zinc-950 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto" ref={scrollRef}>
        <div style={{ minWidth: CONTROLS_WIDTH + contentWidthPx + 100 }} className="relative">

          <div className="flex h-6 sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800 select-none">
            <div className="w-32 shrink-0 sticky left-0 z-40 bg-zinc-950 border-b border-zinc-800 flex items-end px-2 pb-0.5">
              <span className="text-[10px] font-mono" style={{ color: '#c9a961' }}>{formatTime(playheadSec)}</span>
            </div>
            <div
              className="relative cursor-pointer h-full"
              style={{ width: contentWidthPx }}
              onClick={handleRulerClick}
            >
              {rulerMarks.map(sec => (
                <div
                  key={sec}
                  className="absolute top-0 bottom-0"
                  style={{ left: sec * PIXELS_PER_SECOND }}
                >
                  <div className={`h-full ${sec % 5 === 0 ? 'border-l border-zinc-700' : 'border-l border-zinc-800'}`} />
                  {sec % 5 === 0 && (
                    <span className="absolute bottom-0.5 left-1 text-[10px] font-mono whitespace-nowrap" style={{ color: '#c9a961' }}>
                      {formatTime(sec)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="relative pt-2 pb-2">
            <div
              className="absolute pointer-events-none z-0"
              style={{ left: CONTROLS_WIDTH, top: 0, right: 0, bottom: 0 }}
            >
              {rulerMarks.filter(s => s % 5 === 0).map(sec => (
                <div
                  key={sec}
                  className="absolute top-0 bottom-0 border-l border-zinc-800"
                  style={{ left: sec * PIXELS_PER_SECOND }}
                />
              ))}
            </div>

            <div className="relative z-10 space-y-2">
              {tracks.map((track) => {
                const isDrumTrack = track.id === '1';
                const waveformWidthPx = isDrumTrack
                  ? Math.max(4, (track.audioDuration || 0) * PIXELS_PER_SECOND)
                  : 0;
                const numBars = Math.max(50, Math.min(600, Math.floor(waveformWidthPx / 3)));

                return (
                  <Track
                    key={track.id}
                    track={track}
                    isActive={true}
                    isSelected={track.id === selectedTrackId}
                    contentWidth={contentWidthPx}
                    onSelect={() => onSelectTrack(track.id)}
                    onVolumeChange={(vol) => onUpdateTrack(track.id, { volume: vol })}
                    onMuteToggle={() => onUpdateTrack(track.id, { isMuted: !track.isMuted })}
                    onColorChange={(color) => onUpdateTrack(track.id, { color })}
                    onNameChange={(name) => onUpdateTrack(track.id, { name })}
                    onSeek={(sec) => {
                      onSelectClip(null);
                      onSeek(sec);
                    }}
                    onDelete={track.id !== '1' ? () => onDeleteTrack(track.id) : undefined}
                  >
                    {isDrumTrack && track.audioUrl ? (
                      /* ---- Drum track: single waveform ---- */
                      <div
                        className="h-full overflow-hidden cursor-pointer"
                        style={{
                          width: waveformWidthPx,
                          background: 'rgba(39, 39, 42, 0.2)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const sec = Math.max(0, x / PIXELS_PER_SECOND);
                          onSelectClip(null);
                          onSeek(sec);
                        }}
                      >
                        <Waveform audioUrl={track.audioUrl} numBars={numBars} color={track.color} />
                      </div>
                    ) : (track.clips && track.clips.length > 0) ? (
                      /* ---- Track with clips: render positioned blocks ---- */
                      <div
                        className="relative w-full h-full"
                        onClick={(e) => {
                          if (e.target === e.currentTarget) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const sec = Math.max(0, x / PIXELS_PER_SECOND);
                            onSelectClip(null);
                            onSeek(sec);
                          }
                        }}
                      >
                        {track.clips.map(clip => {
                          const clipLeftPx = clip.startSec * PIXELS_PER_SECOND;
                          const clipWidthPx = Math.max(8, clip.durationSec * PIXELS_PER_SECOND);
                          const clipNumBars = Math.max(20, Math.floor(clipWidthPx / 3));
                          const isClipSelected = clip.id === selectedClipId;
                          const color = track.color || '#6366f1';
                          const isDragging = draggingClip?.clipId === clip.id;
                          const isResizing = resizingClip?.clipId === clip.id;

                          return (
                            <div
                              key={clip.id}
                              className={`absolute top-1 bottom-1 rounded overflow-hidden select-none ${
                                isAnyDrag ? '' : 'transition-shadow'
                              } ${
                                isDragging ? 'cursor-grabbing' : isResizing ? 'cursor-col-resize' : 'cursor-grab'
                              }`}
                              style={{
                                left: clipLeftPx,
                                width: clipWidthPx,
                                backgroundColor: `${color}15`,
                                border: isClipSelected
                                  ? `2px solid ${color}`
                                  : `1px solid ${color}55`,
                                boxShadow: isClipSelected
                                  ? `0 0 8px ${color}33`
                                  : isDragging || isResizing
                                    ? `0 0 12px ${color}44`
                                    : 'none',
                                zIndex: isClipSelected || isDragging || isResizing ? 10 : 1,
                              }}
                              onMouseDown={(e) => handleClipMouseDown(e, track.id, clip)}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectClip(clip.id);
                              }}
                              title={`${clip.durationSec.toFixed(1)}s — drag to move, edges to resize, Backspace to delete`}
                            >
                              {/* Left resize handle */}
                              <div
                                className="absolute left-0 top-0 bottom-0 w-1.5 z-20 cursor-col-resize group"
                                onMouseDown={(e) => handleResizeMouseDown(e, track.id, clip, 'left')}
                                title="Drag to trim start"
                              >
                                <div className="w-full h-full rounded-l opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ backgroundColor: `${color}66` }}
                                />
                              </div>

                              {/* Waveform content */}
                              <div className="absolute inset-0 mx-1.5 overflow-hidden pointer-events-none">
                                <Waveform
                                  audioUrl={clip.audioUrl}
                                  numBars={clipNumBars}
                                  color={color}
                                  offsetSec={clip.offsetSec || 0}
                                  visibleDurationSec={clip.durationSec}
                                />
                              </div>

                              {/* Right resize handle */}
                              <div
                                className="absolute right-0 top-0 bottom-0 w-1.5 z-20 cursor-col-resize group"
                                onMouseDown={(e) => handleResizeMouseDown(e, track.id, clip, 'right')}
                                title="Drag to trim end"
                              >
                                <div className="w-full h-full rounded-r opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ backgroundColor: `${color}66` }}
                                />
                              </div>

                              {/* Clip duration label */}
                              <div
                                className="absolute bottom-0.5 right-2 text-[8px] font-mono opacity-50 pointer-events-none"
                                style={{ color }}
                              >
                                {clip.durationSec.toFixed(1)}s
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : !isDrumTrack ? (
                      /* ---- Empty non-drum track ---- */
                      <div
                        className="w-full h-full flex items-center justify-center text-zinc-700 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const sec = Math.max(0, x / PIXELS_PER_SECOND);
                          onSelectClip(null);
                          onSeek(sec);
                        }}
                      >
                        Empty — record to add clips
                      </div>
                    ) : (
                      /* ---- Empty drum track ---- */
                      <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">
                        Upload a drum loop
                      </div>
                    )}
                  </Track>
                );
              })}

              <button
                onClick={onAddTrack}
                className="h-12 border border-dashed border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/30 flex items-center gap-2 text-zinc-600 hover:text-zinc-300 transition-all"
                style={{ width: CONTROLS_WIDTH + contentWidthPx }}
              >
                <div className="w-32 shrink-0 flex items-center gap-2 px-2">
                  <Plus size={14} />
                  <span className="text-xs">Add Track</span>
                </div>
                <div className="flex-1" />
              </button>
            </div>

            <div
              className="absolute top-0 bottom-0 w-px z-20 pointer-events-none"
              style={{
                left: CONTROLS_WIDTH + playheadPx,
                backgroundColor: '#c9a961',
                opacity: 0.7,
              }}
            />
            {/* Draggable playhead square head */}
            <div
              ref={playheadRef}
              className="absolute z-30 cursor-ew-resize rounded-sm"
              style={{
                left: CONTROLS_WIDTH + playheadPx - 4,
                top: 0,
                width: '8px',
                height: '8px',
                backgroundColor: '#c9a961',
                border: '1px solid rgba(201, 169, 97, 0.3)',
              }}
              onMouseDown={handlePlayheadMouseDown}
              title="Drag to seek"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
