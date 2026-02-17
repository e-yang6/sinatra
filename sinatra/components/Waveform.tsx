import React, { useEffect, useState } from 'react';

interface WaveformProps {
  audioUrl?: string;
  numBars?: number;
  color?: string;
  /** Offset into the audio to start displaying (seconds). Used for trimmed clips. */
  offsetSec?: number;
  /** Duration of audio to display (seconds). Used for trimmed clips. */
  visibleDurationSec?: number;
}

export const Waveform: React.FC<WaveformProps> = ({ audioUrl, numBars = 200, color, offsetSec = 0, visibleDurationSec }) => {
  const [waveformData, setWaveformData] = useState<number[]>([]);

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

        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;

        // Calculate the visible slice of the audio
        const startSample = Math.floor(offsetSec * sampleRate);
        const endSample = visibleDurationSec
          ? Math.min(Math.floor((offsetSec + visibleDurationSec) * sampleRate), channelData.length)
          : channelData.length;
        const sliceLength = endSample - startSample;

        if (sliceLength <= 0) {
          setWaveformData([]);
          return;
        }

        const step = Math.floor(sliceLength / numBars);
        const bars: number[] = [];

        for (let i = 0; i < numBars; i++) {
          const start = startSample + i * step;
          const end = Math.min(start + step, endSample);
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
  }, [audioUrl, numBars, offsetSec, visibleDurationSec]);

  if (waveformData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
        No audio
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center gap-[1px] opacity-90" style={{ transform: 'translateZ(0)' }}>
      {waveformData.map((height, i) => (
        <div
          key={i}
          className="rounded-full shrink-0"
          style={{
            width: '2px',
            height: `${Math.max(2, height * 100)}%`,
            minHeight: '2px',
            backgroundColor: color || '#71717a',
          }}
        />
      ))}
    </div>
  );
};
