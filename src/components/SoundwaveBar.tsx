import { useEffect, useRef, useState } from 'react';
import { Recorder } from '../utils/audio';

interface SoundwaveBarProps {
  isRecording: boolean;
  recorder?: Recorder | null;
  barCount?: number;
  activeColor?: string;
  className?: string;
  height?: number;
}

export function SoundwaveBar({
  isRecording,
  recorder,
  barCount = 28,
  activeColor = '#6366f1',
  className = '',
  height = 48,
}: SoundwaveBarProps) {
  const [frequencies, setFrequencies] = useState<number[]>(() =>
    Array.from({ length: barCount }, () => 0.15)
  );
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRecording) {
      // Gentle rest state
      setFrequencies(Array.from({ length: barCount }, (_, i) => {
        const center = (barCount - 1) / 2;
        const dist = Math.abs(i - center) / center;
        return Math.max(0.08, 0.22 - dist * 0.12);
      }));
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const freqArray = new Uint8Array(32);
    let phase = 0;

    const renderFrame = () => {
      phase += 0.08;
      let hasRealAudio = false;

      if (recorder && typeof recorder.getByteFrequencyData === 'function') {
        recorder.getByteFrequencyData(freqArray);
        // Check if there is actual input signal
        const sum = freqArray.reduce((acc, v) => acc + v, 0);
        if (sum > 10) {
          hasRealAudio = true;
        }
      }

      const nextBars: number[] = [];
      const half = barCount / 2;

      for (let i = 0; i < barCount; i++) {
        if (hasRealAudio) {
          // Map index to frequency array bin with symmetric or natural distribution
          const binIndex = Math.min(freqArray.length - 1, Math.floor((i / barCount) * freqArray.length));
          const rawVal = freqArray[binIndex] / 255;
          // Add subtle dynamic boost
          const dynamicVal = Math.min(1, Math.max(0.1, rawVal * 1.4));
          nextBars.push(dynamicVal);
        } else {
          // Organic breathing soundwave while waiting for voice input
          const wave1 = Math.sin(phase + (i * 0.35)) * 0.25;
          const wave2 = Math.cos(phase * 0.7 + (i * 0.2)) * 0.15;
          const centerDist = 1 - Math.abs(i - half) / half;
          const baseline = 0.12 + centerDist * 0.3;
          const val = Math.min(0.9, Math.max(0.12, baseline + wave1 + wave2));
          nextBars.push(val);
        }
      }

      setFrequencies(nextBars);
      animFrameRef.current = requestAnimationFrame(renderFrame);
    };

    animFrameRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isRecording, recorder, barCount]);

  return (
    <div
      className={`flex items-center justify-center gap-1 select-none overflow-hidden px-2 ${className}`}
      style={{ height: `${height}px` }}
      aria-label="Soundwave audio visualizer"
    >
      {frequencies.map((amplitude, idx) => {
        const barHeightPx = Math.max(4, Math.round(amplitude * height));
        const isCenter = Math.abs(idx - barCount / 2) < barCount * 0.25;

        return (
          <div
            key={idx}
            className="w-1.5 rounded-full transition-all duration-75"
            style={{
              height: `${barHeightPx}px`,
              backgroundColor: isRecording
                ? isCenter
                  ? activeColor
                  : `${activeColor}cc`
                : 'rgba(148, 163, 184, 0.35)',
              boxShadow: isRecording && amplitude > 0.4
                ? `0 0 10px ${activeColor}80`
                : 'none',
              transform: isRecording ? 'scaleY(1)' : 'scaleY(0.8)',
            }}
          />
        );
      })}
    </div>
  );
}
