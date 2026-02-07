import React from 'react';
import { Play, Pause, Square, Mic } from 'lucide-react';

interface HeaderProps {
  isPlaying: boolean;
  isRecording: boolean;
  bpm: number;
  metronome: boolean;
  onPlayToggle: () => void;
  onRecordToggle: () => void;
  onStop: () => void;
  onBpmChange: (bpm: number) => void;
  onMetronomeToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isPlaying,
  isRecording,
  bpm,
  metronome,
  onPlayToggle,
  onRecordToggle,
  onStop,
  onBpmChange,
  onMetronomeToggle,
}) => {
  return (
    <div className="h-16 border-b border-zinc-800 flex items-center justify-center px-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onPlayToggle}
            className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            onClick={onStop}
            className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
          >
            <Square size={14} />
          </button>
          <button
            onClick={onRecordToggle}
            className={`w-8 h-8 flex items-center justify-center transition-colors ${
              isRecording ? 'text-red-400' : 'text-zinc-300 hover:text-white'
            }`}
          >
            <Mic size={16} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">BPM</label>
            <input
              type="number"
              value={bpm}
              onChange={(e) => onBpmChange(parseInt(e.target.value) || 120)}
              className="w-16 px-2 py-1 bg-transparent border border-zinc-700 rounded text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
              min="60"
              max="200"
            />
          </div>
          <button
            onClick={onMetronomeToggle}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              metronome
                ? 'bg-zinc-700 text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Metronome
          </button>
        </div>
      </div>
    </div>
  );
};