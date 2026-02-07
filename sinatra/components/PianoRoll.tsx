import React from 'react';
import { Note } from '../types';

interface PianoRollProps {
  notes: Note[];
  colorClass?: string;
}

export const PianoRoll: React.FC<PianoRollProps> = ({ notes, colorClass = "bg-accent" }) => {
  return (
    <div className="relative w-full h-full bg-zinc-900/20" style={{ imageRendering: 'crisp-edges', transform: 'translateZ(0)' }}>
      {/* Grid Lines */}
      <div className="absolute inset-0 grid grid-rows-6 pointer-events-none" style={{ transform: 'translateZ(0)' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border-b border-white/5 w-full h-full" style={{ transform: 'translateZ(0)' }} />
        ))}
      </div>
      <div className="absolute inset-0 grid grid-cols-12 pointer-events-none" style={{ transform: 'translateZ(0)' }}>
        {[...Array(12)].map((_, i) => (
          <div key={i} className="border-r border-white/5 w-full h-full" style={{ transform: 'translateZ(0)' }} />
        ))}
      </div>

      {/* Notes */}
      {notes.map((note) => (
        <div
          key={note.id}
          className={`absolute h-[14%] rounded-md shadow-md border border-white/10 flex items-center justify-center group cursor-pointer hover:brightness-110 transition-all ${colorClass}`}
          style={{
            left: `${note.startTick}%`,
            width: `${note.duration}%`,
            top: `${(12 - note.pitch) * (100 / 12)}%`,
            transform: 'translateZ(0)',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
          }}
        >
          <span className="text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity select-none" style={{ WebkitFontSmoothing: 'antialiased' }}>
            {note.pitch}
          </span>
        </div>
      ))}
    </div>
  );
};