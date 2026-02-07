import React, { useRef, useState, useEffect } from 'react';
import { Upload, Mic, Plus, ChevronDown } from 'lucide-react';
import { InstrumentType } from '../types';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={selectRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 flex items-center justify-between"
      >
        <span>{value}</span>
        <ChevronDown size={12} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded overflow-hidden z-50" style={{ maxHeight: '125px', overflowY: 'auto' }}>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleSelect(option)}
              className={`w-full text-left px-2 py-1.5 text-xs transition-colors ${
                option === value
                  ? 'bg-zinc-800 text-zinc-200'
                  : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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
    <aside className="w-56 border-r border-zinc-800 bg-zinc-950 flex flex-col p-3 gap-3 overflow-y-auto">
      
      <div 
        className="border border-dashed border-zinc-700 hover:border-zinc-600 p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-2 h-24 shrink-0 transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={16} className="text-zinc-500" />
        <div>
          <h3 className="text-xs text-zinc-400">Drop Drum Loop</h3>
          <p className="text-[10px] text-zinc-600 mt-0.5">or click to upload</p>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="audio/*,.wav" 
          onChange={handleFileChange}
        />
      </div>

      <button
        onClick={onAddTrack}
        className="h-8 border border-zinc-800 rounded px-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center gap-2 shrink-0"
      >
        <Plus size={14} />
        Add Track
      </button>

      <div className="border border-zinc-800 rounded p-2 shrink-0 flex flex-col items-center justify-center text-center min-h-[60px]">
        <label className="text-[10px] text-zinc-600">Selected Track</label>
        <p className="text-xs text-zinc-300 mt-1 truncate">{selectedTrackName}</p>
        {isDrumSelected && (
          <p className="text-[10px] text-zinc-600 mt-1">Select a vocal track to record</p>
        )}
      </div>

      {!isDrumSelected && (
        <div className="flex flex-col gap-2 shrink-0">
          <button 
            onClick={onRecordStart}
            disabled={isRecording}
            className={`py-4 border border-zinc-800 rounded flex flex-col items-center justify-center gap-1 transition-colors px-4 ${
              isRecording 
                ? 'text-red-400 border-red-500/30' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mic size={18} />
            <span className="text-xs">
              {isRecording ? 'Recording...' : 'Record'}
            </span>
          </button>
        </div>
      )}

      {!isDrumSelected && (
        <div className="flex flex-col gap-2 shrink-0">
          <label className="text-[10px] text-zinc-600">Instrument</label>
          <CustomSelect
            value={selectedInstrument}
            onChange={onInstrumentChange}
            options={Object.values(InstrumentType)}
          />
        </div>
      )}
      
    </aside>
  );
};
