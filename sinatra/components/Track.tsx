import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { TrackData } from '../types';

interface TrackProps {
  track: TrackData;
  children: React.ReactNode;
  isActive: boolean;
  onVolumeChange: (vol: number) => void;
  onMuteToggle: () => void;
}

export const Track: React.FC<TrackProps> = ({
  track,
  children,
  isActive,
  onVolumeChange,
  onMuteToggle,
}) => {
  return (
    <div className={`relative w-full h-32 flex mb-4 rounded-xl overflow-hidden border transition-colors ${isActive ? 'bg-dark-surface border-zinc-700' : 'bg-dark-bg border-zinc-800 opacity-60 hover:opacity-100'}`}>
      
      {/* Track Controls */}
      <div className="w-32 bg-zinc-900/50 border-r border-zinc-800 p-3 flex flex-col justify-between shrink-0">
        <div>
          <h3 className="text-sm font-medium text-zinc-200 truncate">{track.name}</h3>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{track.type}</span>
        </div>

        <div className="flex flex-col gap-2">
           <div className="flex items-center justify-between">
              <button onClick={onMuteToggle} className="text-zinc-500 hover:text-white transition-colors">
                {track.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <span className="text-[10px] font-mono text-zinc-400">{Math.round(track.volume * 100)}%</span>
           </div>
           <input 
             type="range"
             min="0"
             max="1"
             step="0.01"
             value={track.volume}
             onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
             className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-zinc-400 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-white"
           />
        </div>
      </div>

      {/* Track Content */}
      <div className="flex-1 relative bg-zinc-900/30" style={{ transform: 'translateZ(0)', willChange: 'contents' }}>
        {children}
      </div>
    </div>
  );
};