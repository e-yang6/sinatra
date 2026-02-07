import React, { useRef } from 'react';
import { Upload, Mic, Music, Plus } from 'lucide-react';
import { InstrumentType } from '../types';

interface SidebarLeftProps {
  onInstrumentChange: (inst: InstrumentType) => void;
  selectedInstrument: InstrumentType;
  isRecording: boolean;
  onRecordStart: () => void;
  onDrumUpload?: (file: File) => void;
  onVocalUpload?: (file: File) => void;
  onAddTrack: () => void;
  selectedTrackName: string;
  isDrumSelected: boolean;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  onInstrumentChange,
  selectedInstrument,
  isRecording,
  onRecordStart,
  onDrumUpload,
  onAddTrack,
  selectedTrackName,
  isDrumSelected,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      onDrumUpload?.(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      onDrumUpload?.(file);
    }
  };


  return (
    <aside className="w-64 border-r border-dark-border bg-dark-bg flex flex-col p-4 gap-5 z-40 overflow-y-auto">
      
      {/* 1. Upload Drum Loop */}
      <div 
        className="group relative rounded-xl border-2 border-dashed border-zinc-800 hover:border-accent/50 hover:bg-accent/5 transition-all p-5 text-center cursor-pointer flex flex-col items-center justify-center gap-2 h-32 shrink-0"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Upload size={16} className="text-zinc-400 group-hover:text-accent transition-colors" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-zinc-300 group-hover:text-white">Drop Drum Loop</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">or click to upload</p>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="audio/*,.wav" 
          onChange={handleFileChange}
        />
      </div>

      {/* 2. Add Track */}
      <button
        onClick={onAddTrack}
        className="h-10 rounded-lg bg-accent/10 border border-accent/20 hover:bg-accent/20 hover:border-accent/40 text-accent text-sm font-medium transition-all flex items-center justify-center gap-2 shrink-0"
      >
        <Plus size={16} />
        Add Track
      </button>

      {/* 3. Selected Track Info */}
      <div className="rounded-lg bg-dark-surface border border-dark-border p-3 shrink-0">
        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Selected Track</label>
        <p className="text-sm text-zinc-200 mt-1 truncate">{selectedTrackName}</p>
        {isDrumSelected && (
          <p className="text-[10px] text-yellow-500 mt-1">Select a vocal track to record</p>
        )}
      </div>

      {/* 4. Instrument Picker (for selected track) */}
      {!isDrumSelected && (
        <div className="flex flex-col gap-2 shrink-0">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Instrument</label>
          <div className="relative">
            <select 
              value={selectedInstrument}
              onChange={(e) => onInstrumentChange(e.target.value as InstrumentType)}
              className="w-full appearance-none bg-dark-surface border border-dark-border rounded-lg py-3 px-4 text-sm text-zinc-200 focus:outline-none focus:border-accent hover:border-zinc-600 transition-colors cursor-pointer"
            >
              {Object.values(InstrumentType).map((inst) => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
              <Music size={16} />
            </div>
          </div>
        </div>
      )}

      {/* 5. Record */}
      {!isDrumSelected && (
        <div className="flex flex-col gap-2 shrink-0">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Input</label>
          <button 
            onClick={onRecordStart}
            disabled={isRecording}
            className={`relative h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all overflow-hidden ${
              isRecording 
                ? 'bg-red-500/10 border border-red-500/30' 
                : 'bg-dark-surface border border-dark-border hover:border-zinc-600 hover:bg-zinc-800'
            }`}
          >
            {isRecording && (
               <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
            )}
            <Mic size={24} className={isRecording ? 'text-red-500 animate-bounce' : 'text-zinc-200'} />
            <span className={`text-xs font-medium ${isRecording ? 'text-red-400' : 'text-zinc-400'}`}>
              {isRecording ? 'Recording...' : 'Record Melody'}
            </span>
          </button>
          <p className="text-[10px] text-zinc-600 px-1 text-center">
            Records onto the selected track
          </p>
        </div>
      )}
      
    </aside>
  );
};
