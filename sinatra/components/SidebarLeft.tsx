import React, { useRef, useState, useEffect } from 'react';
import { Upload, ChevronDown, Search, Star } from 'lucide-react';
import { InstrumentType, MUSICAL_KEYS, SCALE_TYPES, QUANTIZE_OPTIONS, MusicalKey, ScaleType, QuantizeOption } from '../types';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

interface InstrumentItem {
  name: string;
  category: 'Piano' | 'Strings' | 'Brass' | 'Woodwinds' | 'Synth' | 'Bass' | 'Guitar' | 'Other';
  isFavorite: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const selectRef = useRef<HTMLDivElement>(null);

  // Map instrument types to categories
  const instrumentCategories: Record<string, InstrumentItem['category']> = {
    'Piano': 'Piano',
    'Electric Piano': 'Piano',
    'Harpsichord': 'Piano',
    'Strings': 'Strings',
    'Violin': 'Strings',
    'Cello': 'Strings',
    'Trumpet': 'Brass',
    'Trombone': 'Brass',
    'French Horn': 'Brass',
    'Flute': 'Woodwinds',
    'Saxophone': 'Woodwinds',
    'Clarinet': 'Woodwinds',
    'Synth': 'Synth',
    'Synth Pad': 'Synth',
    'Synth Lead': 'Synth',
    'Bass': 'Bass',
    'Acoustic Bass': 'Bass',
    'Guitar': 'Guitar',
    'Electric Guitar': 'Guitar',
    'Organ': 'Other',
    'Raw Audio': 'Other',
    'Custom Sample': 'Other',
  };

  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const categories = ['All', 'Piano', 'Strings', 'Brass', 'Woodwinds', 'Synth', 'Bass', 'Guitar', 'Other'];

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

  const toggleFavorite = (instrument: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(instrument)) {
        newFavorites.delete(instrument);
      } else {
        newFavorites.add(instrument);
      }
      return newFavorites;
    });
  };

  const filteredOptions = options
    .filter(option => {
      const matchesSearch = option.toLowerCase().includes(searchQuery.toLowerCase());
      const category = instrumentCategories[option] || 'Other';
      const matchesCategory = !selectedCategory || selectedCategory === 'All' || category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // Sort favorites to the top
      const aIsFavorite = favorites.has(a);
      const bIsFavorite = favorites.has(b);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return 0;
    });

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchQuery('');
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
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded z-50" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <div className="flex flex-col gap-2 p-2">
            {/* Search Bar */}
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="piano, synth, bass..."
                className="w-full pl-7 pr-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-1">
              {categories.map(category => (
                <button
                  key={category}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategory(selectedCategory === category ? null : category);
                  }}
                  className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                    selectedCategory === category
                      ? 'bg-zinc-700 text-zinc-200'
                      : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Instrument List */}
            <div className="flex flex-col gap-1">
              {filteredOptions.length === 0 ? (
                <div className="text-[10px] text-zinc-600 py-2 text-center">No instruments found</div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option}
                    className="flex items-center justify-between px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-[10px] text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700 transition-colors group"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(option);
                      }}
                      className="flex-1 text-left truncate"
                    >
                      {option}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(option);
                      }}
                      className="ml-1 shrink-0"
                    >
                      <Star 
                        size={10} 
                        className={favorites.has(option) ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-500 hover:text-zinc-400'} 
                      />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
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
  onSampleUpload?: (file: File) => void;
  onAddTrack: () => void;
  selectedTrackName: string;
  isDrumSelected: boolean;
  totalDuration?: number;
  sampleName?: string;
  sampleNote?: string;
  // Key / Scale / Quantize
  musicalKey: MusicalKey;
  scaleType: ScaleType;
  quantize: QuantizeOption;
  onKeyChange: (key: MusicalKey) => void;
  onScaleChange: (scale: ScaleType) => void;
  onQuantizeChange: (q: QuantizeOption) => void;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  onInstrumentChange,
  selectedInstrument,
  isRecording,
  onRecordStart,
  onDrumUpload,
  onSampleUpload,
  onAddTrack,
  selectedTrackName,
  isDrumSelected,
  totalDuration = 0,
  sampleName,
  sampleNote,
  musicalKey,
  scaleType,
  quantize,
  onKeyChange,
  onScaleChange,
  onQuantizeChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sampleInputRef = useRef<HTMLInputElement>(null);

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

      {!isDrumSelected && (
        <div className="flex flex-col gap-2 shrink-0">
          <label className="text-[10px] text-zinc-600">Instrument</label>
          <CustomSelect
            value={selectedInstrument}
            onChange={onInstrumentChange}
            options={Object.values(InstrumentType)}
          />

          {/* One-shot sample upload (shown when Custom Sample is selected) */}
          {selectedInstrument === InstrumentType.CUSTOM_SAMPLE && (
            <div className="flex flex-col gap-1.5 mt-1">
              <button
                onClick={() => sampleInputRef.current?.click()}
                className="h-9 rounded-lg bg-dark-surface border border-dashed border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800 text-[11px] text-zinc-400 transition-colors flex items-center justify-center gap-1.5"
              >
                <Upload size={12} />
                {sampleName ? 'Change Sample' : 'Upload One-Shot'}
              </button>
              <input
                type="file"
                ref={sampleInputRef}
                className="hidden"
                accept="audio/*,.wav"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onSampleUpload?.(file);
                  e.target.value = '';
                }}
              />
              {sampleName && (
                <div className="flex flex-col gap-0.5 px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded">
                  <span className="text-[10px] text-zinc-400 truncate" title={sampleName}>
                    {sampleName}
                  </span>
                  {sampleNote && (
                    <span className="text-[10px] text-zinc-500">
                      Base pitch: <span className="text-zinc-300 font-mono">{sampleNote}</span>
                    </span>
                  )}
                </div>
              )}
              {!sampleName && (
                <p className="text-[10px] text-zinc-600 px-1 text-center">
                  Upload a single note/sound to use as instrument
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Key / Scale / Quantize */}
      {!isDrumSelected && selectedInstrument !== InstrumentType.RAW_AUDIO && (
        <div className="flex flex-col gap-2 shrink-0 border border-zinc-800 rounded p-2">
          <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Music Theory</span>

          {/* Key */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 w-14 shrink-0">Key</label>
            <select
              value={musicalKey}
              onChange={(e) => onKeyChange(e.target.value as MusicalKey)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
            >
              {MUSICAL_KEYS.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          {/* Scale */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-zinc-500 w-14 shrink-0">Scale</label>
            <select
              value={scaleType}
              onChange={(e) => onScaleChange(e.target.value as ScaleType)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 capitalize"
            >
              {SCALE_TYPES.map(s => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Quantize */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-zinc-500 font-medium">Quantize</label>
            <div className="flex gap-0.5 flex-wrap">
              {QUANTIZE_OPTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => onQuantizeChange(q)}
                  className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                    quantize === q
                      ? 'bg-accent text-white'
                      : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                  }`}
                >
                  {q === 'off' ? 'Off' : q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {totalDuration > 0 && (
        <div className="flex flex-col gap-2 shrink-0 mt-auto">
          <div className="border border-zinc-800 rounded p-2 shrink-0">
            <div className="text-[10px] text-zinc-600">
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="text-zinc-400 font-mono">{Math.floor(totalDuration / 60)}:{Math.floor(totalDuration % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </aside>
  );
};
