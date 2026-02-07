import React, { useEffect, useRef, useState, useCallback } from 'react';

interface RecordingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'success' | 'error' | 'in_progress';
  message?: string;
  sampleRate?: number;
  peakAmplitude?: number;
}

interface TerminalProps {
  isRecording: boolean;
  audioLevels: number[];
  height?: number;
  onHeightChange?: (height: number) => void;
  recordingSessions?: RecordingSession[];
  currentPeakLevel?: number;
  currentAvgLevel?: number;
}

export const Terminal: React.FC<TerminalProps> = ({ 
  isRecording, 
  audioLevels, 
  height = 220, 
  onHeightChange,
  recordingSessions = [],
  currentPeakLevel = 0,
  currentAvgLevel = 0,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(height);

  // Auto-scroll to bottom when new data comes in
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [audioLevels, recordingSessions]);

  // Update local height when prop changes
  useEffect(() => {
    setTerminalHeight(height);
  }, [height]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      const minHeight = 60;
      const maxHeight = window.innerHeight * 0.6; // Max 60% of screen
      const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
      setTerminalHeight(clampedHeight);
      onHeightChange?.(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onHeightChange]);

  // Generate accurate frequency spectrum visualization
  const renderAudioBars = () => {
    if (!isRecording || audioLevels.length === 0) {
      return (
        <div className="flex items-end gap-[2px] h-12 w-full bg-zinc-900 rounded px-1 py-1">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="w-[3px] bg-zinc-800 rounded-sm"
              style={{ height: '2px' }}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="flex items-end gap-[2px] h-12 w-full bg-zinc-900 rounded px-1 py-1">
        {audioLevels.map((level, i) => {
          // Apply logarithmic scaling for visual accuracy
          const scaledLevel = Math.pow(level, 0.6); // Gamma correction for better visual representation
          const height = Math.max(2, scaledLevel * 100);
          
          // Color gradient based on frequency and amplitude
          // Lower frequencies (left) are cooler, higher (right) are warmer
          const freqPosition = i / audioLevels.length;
          let colorClass = 'bg-zinc-600';
          
          if (scaledLevel > 0.8) {
            colorClass = freqPosition < 0.3 ? 'bg-[#6993cf]' : freqPosition < 0.6 ? 'bg-green-500' : 'bg-yellow-500';
          } else if (scaledLevel > 0.5) {
            colorClass = freqPosition < 0.3 ? 'bg-[#5476a6]' : freqPosition < 0.6 ? 'bg-green-600' : 'bg-yellow-600';
          } else if (scaledLevel > 0.2) {
            colorClass = 'bg-zinc-500';
          }
          
          return (
            <div
              key={i}
              className={`w-[3px] ${colorClass} rounded-sm transition-all duration-50`}
              style={{ 
                height: `${height}%`, 
                minHeight: '2px',
                opacity: Math.max(0.3, scaledLevel)
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div 
      className="border-t border-zinc-800 bg-zinc-950 flex flex-col font-mono text-xs relative"
      style={{ height: `${terminalHeight}px` }}
    >
      <div
        ref={resizeRef}
        onMouseDown={handleMouseDown}
        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize z-10"
        title="Drag to resize terminal"
      />
      <div className="px-3 py-1 border-b border-zinc-800 flex items-center gap-2 text-zinc-500 mt-1">
        <span className="text-green-500">●</span>
        <span>Terminal</span>
        {isRecording && (
          <span className="text-red-500 animate-pulse">● REC</span>
        )}
      </div>
      <div className="flex-1 overflow-hidden flex">
        {/* Left side: Live recording visualization */}
        <div className="flex-1 border-r border-zinc-800 flex flex-col">
          <div className="px-3 py-1 border-b border-zinc-800 text-[10px]" style={{ color: '#c9a961' }}>
            Live Monitor
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 text-zinc-400">
            {isRecording ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <span style={{ color: '#c9a961' }}>→</span>
                    <span className="text-[10px]">Frequency Spectrum</span>
                  </div>
                  {renderAudioBars()}
                </div>
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Peak:</span>
                    <span className="text-zinc-300 font-mono">{(currentPeakLevel * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Avg:</span>
                    <span className="text-zinc-300 font-mono">{(currentAvgLevel * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-zinc-600">$</span>
                <span className="text-zinc-600">Ready. Press record to start.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Recording session log */}
        <div className="flex-1 flex flex-col">
          <div className="px-3 py-1 border-b border-zinc-800 text-[10px]" style={{ color: '#c9a961' }}>
            Session Log
          </div>
          <div
            ref={terminalRef}
            className="flex-1 overflow-y-auto px-3 py-2 text-zinc-400 space-y-2"
          >
            {recordingSessions.length === 0 ? (
              <div className="text-zinc-600 text-[10px]">No recordings yet</div>
            ) : (
              recordingSessions.slice().reverse().map((session) => (
                <div key={session.id} className="text-[10px] space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={session.status === 'success' ? 'text-green-500' : session.status === 'error' ? 'text-red-500' : 'text-yellow-500'}>
                      {session.status === 'success' ? '✓' : session.status === 'error' ? '✗' : '●'}
                    </span>
                    <span className="text-zinc-300">
                      {session.startTime.toLocaleTimeString()}
                    </span>
                    {session.endTime && (
                      <span className="text-zinc-500">
                        → {session.endTime.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  {session.duration !== undefined && (
                    <div className="pl-4 text-zinc-500">
                      Duration: <span className="text-zinc-300 font-mono">{session.duration.toFixed(1)}s</span>
                    </div>
                  )}
                  {session.sampleRate && (
                    <div className="pl-4 text-zinc-500">
                      Sample Rate: <span className="text-zinc-300 font-mono">{session.sampleRate}Hz</span>
                    </div>
                  )}
                  {session.peakAmplitude !== undefined && (
                    <div className="pl-4 text-zinc-500">
                      Peak: <span className="text-zinc-300 font-mono">{(session.peakAmplitude * 100).toFixed(1)}%</span>
                    </div>
                  )}
                  {session.message && (
                    <div className="pl-4 text-zinc-500 italic">
                      {session.message}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
