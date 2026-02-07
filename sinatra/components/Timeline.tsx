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
    <div className="flex-1 bg-zinc-950 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto" ref={scrollRef}>
        <div style={{ minWidth: CONTROLS_WIDTH + contentWidthPx + 100 }} className="relative">

          <div className="flex h-6 sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800 select-none">
            <div className="w-32 shrink-0 sticky left-0 z-40 bg-zinc-950 border-b border-zinc-800 flex items-end px-2 pb-0.5">
              <span className="text-[10px] text-zinc-500 font-mono">{formatTime(playheadSec)}</span>
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
                    <span className="absolute bottom-0.5 left-1 text-[10px] text-zinc-600 font-mono whitespace-nowrap">
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
                          onSeek(sec);
                        }}
                        title="Click to seek"
                      >
                        <Waveform audioUrl={track.audioUrl} numBars={numBars} color={track.color} />
                      </div>
                    ) : track.type === 'midi' ? (
                      <PianoRoll notes={notes} colorClass="bg-zinc-600" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">
                        No audio
                      </div>
                    )}
                  </Track>
                );
              })}

              <button
                onClick={onAddTrack}
                className="h-12 border border-dashed border-zinc-800 hover:border-zinc-700 flex items-center justify-center gap-2 text-zinc-600 hover:text-zinc-400 transition-colors"
                style={{ width: CONTROLS_WIDTH + contentWidthPx }}
              >
                <Plus size={14} />
                <span className="text-xs">Add Track</span>
              </button>
            </div>

            <div
              className="absolute top-0 bottom-0 w-px bg-zinc-400 z-20 pointer-events-none"
              style={{
                left: CONTROLS_WIDTH + playheadPx,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
