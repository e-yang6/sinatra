import React, { useRef } from 'react';
import { Upload, Mic, Music } from 'lucide-react';
import { InstrumentType } from '../types';

interface SidebarLeftProps {
  onInstrumentChange: (inst: InstrumentType) => void;
  selectedInstrument: InstrumentType;
  isRecording: boolean;
  onRecordStart: () => void;
  onDrumUpload?: (file: File) => void;
  onVocalUpload?: (file: File) => void;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  onInstrumentChange,
  selectedInstrument,
  isRecording,
  onRecordStart,
  onDrumUpload,
  onVocalUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vocalInputRef = useRef<HTMLInputElement>(null);

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

  const handleVocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      onVocalUpload?.(file);
    }
  };

  return (
    <aside className="w-64 border-r border-dark-border bg-dark-bg flex flex-col p-4 gap-6 z-40">
      
      {/* 1. Upload Drum Loop */}
      <div 
        className="group relative rounded-xl border-2 border-dashed border-zinc-800 hover:border-accent/50 hover:bg-accent/5 transition-all p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-3 h-40"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Upload size={18} className="text-zinc-400 group-hover:text-accent transition-colors" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-zinc-300 group-hover:text-white">Drop Drum Loop</h3>
          <p className="text-xs text-zinc-500 mt-1">or click to upload</p>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="audio/*,.wav" 
          onChange={handleFileChange}
        />
      </div>

      {/* 2. Record Melody */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Input</label>
        <div className="flex flex-col gap-2">
          <button 
            onClick={onRecordStart}
            disabled={isRecording}
            className={`relative h-20 rounded-xl flex flex-col items-center justify-center gap-2 transition-all overflow-hidden ${
              isRecording 
                ? 'bg-red-500/10 border border-red-500/30' 
                : 'bg-dark-surface border border-dark-border hover:border-zinc-600 hover:bg-zinc-800'
            }`}
          >
            {isRecording && (
               <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
            )}
            <Mic size={28} className={isRecording ? 'text-red-500 animate-bounce' : 'text-zinc-200'} />
            <span className={`text-sm font-medium ${isRecording ? 'text-red-400' : 'text-zinc-400'}`}>
              {isRecording ? 'Listening...' : 'Record Melody'}
            </span>
          </button>
          <button
            onClick={() => vocalInputRef.current?.click()}
            className="h-10 rounded-lg bg-dark-surface border border-dark-border hover:border-zinc-600 hover:bg-zinc-800 text-xs text-zinc-400 transition-colors"
          >
            Or Upload WAV File
          </button>
          <input 
            type="file" 
            ref={vocalInputRef} 
            className="hidden" 
            accept="audio/*,.wav" 
            onChange={handleVocalFileChange}
          />
        </div>
        <p className="text-[10px] text-zinc-600 px-1 text-center">
          Sing or hum your melody — full performance captured
        </p>
      </div>

      {/* 3. Instrument Picker */}
      <div className="flex flex-col gap-2">
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
      
    </aside>
  );
};