import React, { useEffect, useRef, useState, useCallback } from 'react';

interface TerminalProps {
  isRecording: boolean;
  audioLevels: number[];
  height?: number;
  onHeightChange?: (height: number) => void;
}

export const Terminal: React.FC<TerminalProps> = ({ isRecording, audioLevels, height = 96, onHeightChange }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(height);

  // Auto-scroll to bottom when new data comes in
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [audioLevels]);

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

  // Generate frequency bars visualization
  const renderAudioBars = () => {
    if (!isRecording || audioLevels.length === 0) {
      return (
        <div className="flex items-center gap-1 h-8">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-zinc-800 rounded-full"
              style={{ height: '2px' }}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="flex items-end gap-0.5 h-8">
        {audioLevels.map((level, i) => {
          const height = Math.max(2, level * 100);
          const color = level > 0.7 ? 'bg-red-500' : level > 0.4 ? 'bg-yellow-500' : 'bg-green-500';
          return (
            <div
              key={i}
              className={`w-1 ${color} rounded-full transition-all duration-75`}
              style={{ height: `${height}%`, minHeight: '2px' }}
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
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto px-3 py-2 text-zinc-400"
      >
        {isRecording ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-green-500">$</span>
              <span>Recording audio...</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-500">→</span>
              <span>Input level:</span>
              {renderAudioBars()}
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
  );
};
