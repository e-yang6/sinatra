import React, { useMemo, useEffect, useState } from 'react';

interface WaveformProps {
  audioUrl?: string;
  samples?: Float32Array; // Optional: pre-computed samples
}

export const Waveform: React.FC<WaveformProps> = ({ audioUrl, samples }) => {
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // Generate waveform from audio URL
  useEffect(() => {
    if (!audioUrl) {
      setWaveformData([]);
      return;
    }

    const ctx = new AudioContext();
    const fetchAndAnalyze = async () => {
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        
        // Get mono channel data
        const channelData = audioBuffer.getChannelData(0);
        const length = channelData.length;
        
        // Downsample to ~200 bars for display
        const numBars = 200;
        const step = Math.floor(length / numBars);
        const bars: number[] = [];
        
        for (let i = 0; i < numBars; i++) {
          const start = i * step;
          const end = Math.min(start + step, length);
          let max = 0;
          for (let j = start; j < end; j++) {
            max = Math.max(max, Math.abs(channelData[j]));
          }
          bars.push(max);
        }
        
        setWaveformData(bars);
      } catch (err) {
        console.error('[Waveform] Failed to analyze audio:', err);
        setWaveformData([]);
      } finally {
        ctx.close();
      }
    };

    fetchAndAnalyze();
  }, [audioUrl]);

  // Or use pre-computed samples
  useEffect(() => {
    if (samples && samples.length > 0) {
      const numBars = 200;
      const step = Math.floor(samples.length / numBars);
      const bars: number[] = [];
      
      for (let i = 0; i < numBars; i++) {
        const start = i * step;
        const end = Math.min(start + step, samples.length);
        let max = 0;
        for (let j = start; j < end; j++) {
          max = Math.max(max, Math.abs(samples[j]));
        }
        bars.push(max);
      }
      
      setWaveformData(bars);
    }
  }, [samples]);

  // Fallback: show empty state or placeholder
  if (waveformData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
        No audio
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-between gap-[1px] px-2 opacity-90" style={{ transform: 'translateZ(0)', willChange: 'transform' }}>
      {waveformData.map((height, i) => (
        <div
          key={i}
          className="bg-zinc-500 rounded-full transition-all hover:bg-zinc-400"
          style={{ 
            width: '2px',
            height: `${Math.max(2, height * 100)}%`,
            minHeight: '2px',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        />
      ))}
    </div>
  );
};
