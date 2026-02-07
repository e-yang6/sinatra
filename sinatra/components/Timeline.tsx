import React, { useRef, useEffect } from 'react';
import { Track } from './Track';
import { Waveform } from './Waveform';
import { PianoRoll } from './PianoRoll';
import { TrackData, Note } from '../types';

interface TimelineProps {
  playheadPosition: number; // 0-100 percentage
  tracks: TrackData[];
  notes: Note[];
  onUpdateTrack: (id: string, updates: Partial<TrackData>) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  playheadPosition,
  tracks,
  notes,
  onUpdateTrack,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic could go here if the timeline was wider than the screen

  return (
    <div className="flex-1 bg-dark-bg p-6 overflow-y-auto overflow-x-hidden relative" ref={containerRef}>
      
      {/* Time Ruler (Visual Only) */}
      <div className="flex h-6 mb-2 pl-32 relative text-[10px] text-zinc-600 font-mono select-none">
         {[...Array(9)].map((_, i) => (
           <div key={i} className="flex-1 border-l border-zinc-800 pl-1">
             {i + 1}
           </div>
         ))}
      </div>

      <div className="relative">
        {/* Global Grid Overlay */}
        <div className="absolute inset-0 pl-32 pointer-events-none z-0">
          <div className="w-full h-full border-l border-zinc-800/50 flex">
             {[...Array(8)].map((_, i) => (
               <div key={i} className="flex-1 border-r border-zinc-800/30" />
             ))}
          </div>
        </div>

        {/* Tracks */}
        <div className="relative z-10 space-y-4">
          {tracks.map((track) => (
            <Track
              key={track.id}
              track={track}
              isActive={true}
              onVolumeChange={(vol) => onUpdateTrack(track.id, { volume: vol })}
              onMuteToggle={() => onUpdateTrack(track.id, { isMuted: !track.isMuted })}
            >
              {track.type === 'audio' ? (
                <Waveform audioUrl={track.audioUrl} />
              ) : (
                <PianoRoll notes={notes} colorClass="bg-accent shadow-[0_0_10px_rgba(99,102,241,0.4)]" />
              )}
            </Track>
          ))}
        </div>

        {/* Playhead */}
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] z-20 pointer-events-none transition-transform duration-75 ease-linear will-change-transform"
          style={{ 
            left: `calc(8rem + (100% - 8rem) * ${playheadPosition / 100})`,
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        >
          <div className="w-3 h-3 bg-white rotate-45 -ml-[5px] -mt-[6px] rounded-[1px]" style={{ transform: 'translateZ(0)' }} />
        </div>
      </div>
    </div>
  );
};