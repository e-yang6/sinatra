import React, { useState } from 'react';
import { Volume2, VolumeX, Palette } from 'lucide-react';
import { TrackData } from '../types';

const TRACK_COLORS = [
  '#6366f1', // accent (indigo)
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
];

interface TrackProps {
  track: TrackData;
  children: React.ReactNode;
  isActive: boolean;
  isSelected: boolean;
  contentWidth: number;
  onSelect: () => void;
  onVolumeChange: (vol: number) => void;
  onMuteToggle: () => void;
  onColorChange: (color: string) => void;
}

export const Track: React.FC<TrackProps> = ({
  track,
  children,
  isActive,
  isSelected,
  contentWidth,
  onSelect,
  onVolumeChange,
  onMuteToggle,
  onColorChange,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const trackColor = track.color || TRACK_COLORS[0];
  
  const borderColorClass = isSelected
    ? ''
    : isActive
      ? 'border-zinc-700/50'
      : 'border-zinc-800';
  
  const borderStyle = isSelected
    ? { borderColor: `${trackColor}99` }
    : {};

  return (
    <div className="flex h-28 relative cursor-pointer" onClick={onSelect}>
      {/* Track Controls — sticky to left edge during horizontal scroll */}
      <div
        className={`w-32 shrink-0 sticky left-0 z-20 rounded-l-xl border-2 border-r-0 p-3 flex flex-col justify-between transition-all ${borderColorClass} ${
          isSelected
            ? 'bg-zinc-900'
            : isActive
              ? 'bg-zinc-900'
              : 'bg-zinc-900 opacity-60'
        }`}
        style={{
          borderRight: '1px solid rgba(63, 63, 70, 0.5)',
          ...borderStyle,
          boxShadow: isSelected ? `0 0 12px ${trackColor}26` : undefined,
        }}
      >
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-medium text-zinc-200 truncate flex-1">{track.name}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="shrink-0 ml-1 p-1 rounded hover:bg-zinc-800 transition-colors"
              title="Change track color"
            >
              <Palette size={12} className="text-zinc-400" style={{ color: trackColor }} />
            </button>
          </div>
          {showColorPicker && (
            <div
              className="absolute left-0 top-10 z-50 bg-zinc-800 border border-zinc-700 rounded-lg p-2 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-5 gap-1.5">
                {TRACK_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      onColorChange(color);
                      setShowColorPicker(false);
                    }}
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      trackColor === color ? 'border-white scale-110' : 'border-zinc-600 hover:border-zinc-400'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{track.type}</span>
            {track.instrument && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${trackColor}26`, color: trackColor }}>
                {track.instrument}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <button
              onClick={(e) => { e.stopPropagation(); onMuteToggle(); }}
              className="text-zinc-500 hover:text-white transition-colors"
            >
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
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-zinc-400 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-white"
          />
        </div>
      </div>

      {/* Track Content — scrolls horizontally */}
      <div
        className={`relative rounded-r-xl border-2 border-l-0 bg-zinc-900/30 overflow-hidden ${borderColorClass}`}
        style={{
          width: contentWidth,
          minWidth: contentWidth,
          ...borderStyle,
        }}
      >
        {children}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] z-30 rounded-l-xl"
          style={{ backgroundColor: trackColor }}
        />
      )}
    </div>
  );
};
