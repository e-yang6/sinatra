import React from 'react';
import { Settings2, Music2, Magnet, Zap } from 'lucide-react';
import { KeyScale } from '../types';

interface SidebarRightProps {
  scale: KeyScale;
  setScale: (scale: KeyScale) => void;
  snapToScale: boolean;
  setSnapToScale: (val: boolean) => void;
  quantizeStrength: number;
  setQuantizeStrength: (val: number) => void;
}

export const SidebarRight: React.FC<SidebarRightProps> = ({
  scale,
  setScale,
  snapToScale,
  setSnapToScale,
  quantizeStrength,
  setQuantizeStrength,
}) => {
  return (
    <aside className="w-60 border-l border-dark-border bg-dark-bg p-4 flex flex-col gap-6">
      <div className="flex items-center gap-2 text-zinc-400 mb-2">
        <Settings2 size={16} />
        <span className="text-xs font-semibold uppercase tracking-wider">Inspector</span>
      </div>

      {/* Scale Settings */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-zinc-300 text-sm">
          <Music2 size={14} className="text-accent" />
          <span className="font-medium">Key & Scale</span>
        </div>
        <select 
          value={scale}
          onChange={(e) => setScale(e.target.value as KeyScale)}
          className="w-full bg-dark-surface border border-dark-border rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-accent"
        >
          {Object.values(KeyScale).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Quantize */}
      <div className="space-y-4">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2 text-zinc-300 text-sm">
            <Magnet size={14} className="text-accent" />
            <span className="font-medium">Snap</span>
          </div>
          <button 
            onClick={() => setSnapToScale(!snapToScale)}
            className={`w-8 h-4 rounded-full relative transition-colors ${snapToScale ? 'bg-accent' : 'bg-zinc-700'}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${snapToScale ? 'left-4.5 translate-x-1' : 'left-0.5'}`} />
          </button>
         </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-zinc-300 text-sm">
           <div className="flex items-center gap-2">
            <Zap size={14} className="text-accent" />
            <span className="font-medium">Quantize</span>
          </div>
          <span className="text-xs text-zinc-500">{quantizeStrength}%</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={quantizeStrength}
          onChange={(e) => setQuantizeStrength(parseInt(e.target.value))}
          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
        />
      </div>

      <div className="mt-auto border-t border-dark-border pt-4">
         <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
           <span>CPU</span>
           <span className="text-green-500">4%</span>
         </div>
         <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
           <div className="w-[4%] h-full bg-green-500"></div>
         </div>
      </div>
    </aside>
  );
};