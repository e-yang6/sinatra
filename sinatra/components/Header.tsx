import React from 'react';
import { Play, Pause, Square, Mic, Volume2, Download } from 'lucide-react';

const sinatraLogo = new URL('../assets/SinAtraa-removebg-preview.png', import.meta.url).href;

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
  masterVolume?: number;
  onMasterVolumeChange?: (volume: number) => void;
  onExport?: () => void;
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
  masterVolume = 1.0,
  onMasterVolumeChange,
  onExport,
}) => {
  return (
    <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-4 relative">
      {/* Left: Logo */}
      <div className="flex items-center">
        <img 
          src={sinatraLogo} 
          alt="SINATRA" 
          className="h-12 object-contain"
        />
      </div>

      {/* Center: Transport controls and BPM - absolutely centered */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onPlayToggle}
            className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:text-white transition-colors border border-zinc-700 rounded-full hover:border-zinc-600"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            onClick={onStop}
            className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:text-white transition-colors border border-zinc-700 rounded-full hover:border-zinc-600"
          >
            <Square size={14} />
          </button>
          <button
            onClick={onRecordToggle}
            className={`w-8 h-8 flex items-center justify-center transition-colors border rounded-full ${
              isRecording 
                ? 'text-red-400 border-red-500/50' 
                : 'text-zinc-300 hover:text-white border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <Mic size={16} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500 font-mono">BPM</label>
            <input
              type="number"
              value={bpm}
              onChange={(e) => onBpmChange(parseInt(e.target.value) || 120)}
              className="w-16 px-2 py-1 bg-transparent border border-zinc-700 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 font-mono"
              min="60"
              max="200"
            />
          </div>
          <button
            onClick={onMetronomeToggle}
            className={`text-xs px-2 py-1 rounded transition-colors font-mono ${
              metronome
                ? 'bg-zinc-700 text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Metronome
          </button>
        </div>
      </div>

      {/* Right: Master Volume and Export */}
      <div className="flex items-center gap-4">
        {onMasterVolumeChange && (
          <div className="flex items-center gap-2">
            <Volume2 size={14} className="text-zinc-500" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
              className="w-24 h-0.5 bg-zinc-800 rounded appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-zinc-500 [&::-webkit-slider-thumb]:rounded-sm [&::-moz-range-thumb]:w-2 [&::-moz-range-thumb]:h-2 [&::-moz-range-thumb]:bg-zinc-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-sm"
            />
            <span className="text-[10px] font-mono text-zinc-500 w-8 text-right">{Math.round(masterVolume * 100)}</span>
          </div>
        )}
        {onExport && (
          <button
            onClick={onExport}
            className="h-8 border border-zinc-800 rounded px-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center gap-2"
          >
            <Download size={12} />
            Export
          </button>
        )}
      </div>
    </div>
  );
};