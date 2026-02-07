import React, { useRef, useEffect } from 'react';
import { Track } from './Track';
import { Waveform } from './Waveform';
import { PianoRoll } from './PianoRoll';
import { TrackData, Note } from '../types';
import { Plus } from 'lucide-react';

const PIXELS_PER_SECOND = 80;
const MIN_TIMELINE_SEC = 30;
const CONTROLS_WIDTH = 128; // w-32 = 8rem

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
  isPlaying: boolean;
  onSelectTrack: (id: string) => void;
  onUpdateTrack: (id: string, updates: Partial<TrackData>) => void;
  onAddTrack: () => void;
  onDeleteTrack: (id: string) => void;
  onSeek: (sec: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  playheadSec,
  tracks,
  notes,
  selectedTrackId,
  isPlaying,
  onSelectTrack,
  onUpdateTrack,
  onAddTrack,
  onDeleteTrack,
  onSeek,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calculate timeline width from longest track
  const maxDuration = Math.max(
    MIN_TIMELINE_SEC,
    ...tracks.map(t => t.audioDuration || 0),
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
    onSeek(sec);
  };

  // Auto-scroll to keep playhead visible
  useEffect(() => {
    if (!scrollRef.current || !isPlaying) return;
    const el = scrollRef.current;
    const playheadPx = playheadSec * PIXELS_PER_SECOND;
    const viewWidth = el.clientWidth - CONTROLS_WIDTH;
    const viewRight = el.scrollLeft + viewWidth;

    if (playheadPx > viewRight - 80 || playheadPx < el.scrollLeft) {
      el.scrollLeft = Math.max(0, playheadPx - 200);
    }
  }, [playheadSec, isPlaying]);

  const playheadPx = playheadSec * PIXELS_PER_SECOND;

  return (
    <div className="flex-1 bg-dark-bg overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto" ref={scrollRef}>
        <div style={{ minWidth: CONTROLS_WIDTH + contentWidthPx + 100 }} className="relative">

          {/* ---- Time Ruler ---- */}
          <div className="flex h-8 sticky top-0 z-30 bg-dark-bg border-b border-zinc-800 select-none">
            {/* Corner: shows current time, sticky both ways */}
            <div className="w-32 shrink-0 sticky left-0 z-40 bg-dark-bg border-b border-zinc-800 flex items-end px-3 pb-1">
              <span className="text-[10px] text-zinc-400 font-mono">{formatTime(playheadSec)}</span>
            </div>
            {/* Ruler ticks — click to seek */}
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
                  <div className={`h-full ${sec % 5 === 0 ? 'border-l border-zinc-600' : 'border-l border-zinc-800/50'}`} />
                  {sec % 5 === 0 && (
                    <span className="absolute bottom-1 left-1.5 text-[10px] text-zinc-500 font-mono whitespace-nowrap">
                      {formatTime(sec)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ---- Tracks Area ---- */}
          <div className="relative pt-3 pb-3">

            {/* Grid lines (every 5 seconds) */}
            <div
              className="absolute pointer-events-none z-0"
              style={{ left: CONTROLS_WIDTH, top: 0, right: 0, bottom: 0 }}
            >
              {rulerMarks.filter(s => s % 5 === 0).map(sec => (
                <div
                  key={sec}
                  className="absolute top-0 bottom-0 border-l border-zinc-800/20"
                  style={{ left: sec * PIXELS_PER_SECOND }}
                />
              ))}
            </div>

            {/* Tracks */}
            <div className="relative z-10 space-y-3">
              {tracks.map((track) => {
                const waveformWidthPx = Math.max(4, (track.audioDuration || 0) * PIXELS_PER_SECOND);
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
                    onSeek={onSeek}
                    onDelete={track.id !== '1' ? () => onDeleteTrack(track.id) : undefined}
                  >
                    {track.audioUrl ? (
                      <div
                        className="h-full rounded-md overflow-hidden cursor-pointer hover:bg-zinc-800/20 transition-colors"
                        style={{
                          width: waveformWidthPx,
                          background: 'rgba(39, 39, 42, 0.3)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const sec = Math.max(0, x / PIXELS_PER_SECOND);
                          onSeek(sec);
                        }}
                        title="Click to seek"
                      >
                        <Waveform audioUrl={track.audioUrl} numBars={numBars} color={track.color} />
                      </div>
                    ) : track.type === 'midi' ? (
                      <PianoRoll notes={notes} colorClass="bg-accent shadow-[0_0_10px_rgba(99,102,241,0.4)]" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                        No audio
                      </div>
                    )}
                  </Track>
                );
              })}

              {/* Add Track Button */}
              <button
                onClick={onAddTrack}
                className="h-14 rounded-xl border-2 border-dashed border-zinc-800 hover:border-accent/40 hover:bg-accent/5 transition-all flex items-center justify-center gap-2 text-zinc-600 hover:text-accent"
                style={{ width: CONTROLS_WIDTH + contentWidthPx }}
              >
                <Plus size={16} />
                <span className="text-xs font-medium">Add Track</span>
              </button>
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] z-20 pointer-events-none"
              style={{
                left: CONTROLS_WIDTH + playheadPx,
                transform: 'translateZ(0)',
              }}
            >
              <div className="w-3 h-3 bg-white rotate-45 -ml-[5px] -mt-1 rounded-[1px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
