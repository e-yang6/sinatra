import React, { useState } from 'react';
import { Volume2, VolumeX, Palette, Trash2 } from 'lucide-react';
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

const DeleteConfirmPopup: React.FC<{ trackName: string; onConfirm: () => void; onCancel: () => void }> = ({
  trackName,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded px-4 py-3 min-w-[280px]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-zinc-300 mb-4">Delete "{trackName}"?</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 rounded transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

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
  onNameChange: (name: string) => void;
  onSeek: (sec: number) => void;
  onDelete?: () => void;
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
  onNameChange,
  onSeek,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(track.name);
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
    <div className="flex h-24 relative cursor-pointer" onClick={onSelect}>
      <div
        className={`w-32 shrink-0 sticky left-0 z-20 border-r border-zinc-800 p-2 flex flex-col justify-between ${
          isSelected
            ? 'bg-zinc-900'
            : 'bg-zinc-950'
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-1">
            {isEditingName ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => {
                  if (editName.trim()) {
                    onNameChange(editName.trim());
                  } else {
                    setEditName(track.name);
                  }
                  setIsEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (editName.trim()) {
                      onNameChange(editName.trim());
                    } else {
                      setEditName(track.name);
                    }
                    setIsEditingName(false);
                  } else if (e.key === 'Escape') {
                    setEditName(track.name);
                    setIsEditingName(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-zinc-200 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 flex-1 outline-none focus:border-zinc-600"
                autoFocus
              />
            ) : (
              <h3
                className="text-xs text-zinc-300 truncate flex-1 cursor-text hover:text-zinc-200"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingName(true);
                  setEditName(track.name);
                }}
                title="Click to rename"
              >
                {track.name}
              </h3>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="shrink-0 ml-1 p-0.5 hover:bg-zinc-800 rounded"
              title="Change track color"
            >
              <Palette size={10} style={{ color: trackColor }} />
            </button>
          </div>
          {showColorPicker && (
            <div
              className="absolute left-0 top-8 z-50 bg-zinc-900 border border-zinc-800 rounded p-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-5 gap-1">
                {TRACK_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      onColorChange(color);
                      setShowColorPicker(false);
                    }}
                    className={`w-5 h-5 rounded border ${
                      trackColor === color ? 'border-zinc-300' : 'border-zinc-700'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
          {track.instrument && (
            <span className="text-[9px] text-zinc-500 mt-0.5">{track.instrument}</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <button
              onClick={(e) => { e.stopPropagation(); onMuteToggle(); }}
              className="text-zinc-500 hover:text-zinc-300"
            >
              {track.isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
            </button>
            <span className="text-[10px] font-mono text-zinc-500">{Math.round(track.volume * 100)}</span>
          </div>
          {onDelete && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                className="text-[10px] text-zinc-500 hover:text-zinc-400 transition-colors flex items-center gap-1 justify-center"
                title="Delete track"
              >
                <Trash2 size={10} />
                Delete
              </button>
              {showDeleteConfirm && (
                <DeleteConfirmPopup
                  trackName={track.name}
                  onConfirm={() => {
                    onDelete();
                    setShowDeleteConfirm(false);
                  }}
                  onCancel={() => setShowDeleteConfirm(false)}
                />
              )}
            </>
          )}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={track.volume}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-0.5 bg-zinc-800 rounded appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-zinc-500 [&::-webkit-slider-thumb]:rounded-sm [&::-moz-range-thumb]:w-2 [&::-moz-range-thumb]:h-2 [&::-moz-range-thumb]:bg-zinc-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-sm"
          />
        </div>
      </div>

      <div
        className={`relative border-r border-zinc-800 overflow-hidden cursor-pointer ${
          isSelected ? 'bg-zinc-900/50' : 'bg-zinc-950'
        }`}
        style={{
          width: contentWidth,
          minWidth: contentWidth,
        }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target === e.currentTarget) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const PIXELS_PER_SECOND = 80;
            const sec = Math.max(0, x / PIXELS_PER_SECOND);
            onSeek(sec);
          }
        }}
        title="Click to seek"
      >
        {children}
      </div>

      {isSelected && (
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5 z-30"
          style={{ backgroundColor: trackColor }}
        />
      )}
    </div>
  );
};
