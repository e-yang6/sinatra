import React, { useState, useEffect } from 'react';
import { Play, Square, Circle, Mic, Activity, RefreshCw } from 'lucide-react';

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
  const [bpmInput, setBpmInput] = useState(bpm.toString());
  
  // Sync input when BPM changes externally (e.g., from drum upload)
  useEffect(() => {
    setBpmInput(bpm.toString());
  }, [bpm]);

  const handleBpmChange = (value: string) => {
    setBpmInput(value);
  };

  const handleBpmBlur = () => {
    const val = parseInt(bpmInput);
    if (isNaN(val) || val < 60) {
      setBpmInput('60');
      onBpmChange(60);
    } else if (val > 200) {
      setBpmInput('200');
      onBpmChange(200);
    } else {
      onBpmChange(val);
    }
  };

  const handleBpmKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <header className="h-16 border-b border-dark-border bg-dark-bg/95 flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-4 w-48">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
          <Activity size={20} className="text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">Sinatra</h1>
      </div>

      <div className="flex items-center gap-6 bg-dark-surface px-6 py-2 rounded-full border border-dark-border shadow-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={onPlayToggle}
            className={`p-2 rounded-full transition-all ${
              isPlaying ? 'bg-accent text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'hover:bg-zinc-800 text-zinc-300'
            }`}
          >
            {isPlaying ? <span className="font-bold text-xs">||</span> : <Play size={20} fill="currentColor" />}
          </button>
          
          <button
            onClick={onStop}
            className="p-2 rounded-full hover:bg-zinc-800 text-zinc-300 transition-colors"
          >
            <Square size={18} fill="currentColor" />
          </button>

          <button
            onClick={onRecordToggle}
            className={`p-2 rounded-full transition-all ml-2 ${
              isRecording 
                ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                : 'text-red-500 hover:bg-red-500/10'
            }`}
          >
            <Circle size={20} fill="currentColor" />
          </button>
        </div>

        <div className="h-6 w-[1px] bg-zinc-700 mx-2" />

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center group relative">
            <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">BPM</span>
            <input
              type="text"
              value={bpmInput}
              onChange={(e) => handleBpmChange(e.target.value)}
              onBlur={handleBpmBlur}
              onKeyDown={handleBpmKeyDown}
              className="text-lg font-mono font-medium text-zinc-200 bg-transparent border-none outline-none w-12 text-center focus:text-accent focus:bg-zinc-800/50 rounded px-1 transition-colors cursor-text hover:bg-zinc-800/30"
            />
          </div>
          
          <button 
            onClick={onMetronomeToggle}
            className={`flex flex-col items-center transition-colors ${metronome ? 'text-accent' : 'text-zinc-600'}`}
          >
             <span className="text-[10px] uppercase font-medium tracking-wider mb-0.5 opacity-70">Click</span>
             <div className={`w-3 h-3 rounded-full border-2 ${metronome ? 'bg-accent border-accent' : 'border-current'}`} />
          </button>
        </div>
      </div>

      <div className="w-48 flex justify-end">
        <button 
          onClick={() => {
            if (window.confirm('Reset project? This will clear all tracks and recordings.')) {
              window.location.reload();
            }
          }}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={14} />
          Reset Project
        </button>
      </div>
    </header>
  );
};