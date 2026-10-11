import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, RotateCcw } from 'lucide-react';

interface AudioPlayerWaveProps {
  audioData?: string; // base64 or url
  duration?: number; // seconds
  title?: string;
  size?: 'sm' | 'md';
}

export function AudioPlayerWave({ audioData, duration = 0, title = 'Audio clip', size = 'md' }: AudioPlayerWaveProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.warn('Audio play error:', e));
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const audioSrc = audioData?.startsWith('data:') || audioData?.startsWith('http')
    ? audioData
    : audioData
    ? `data:audio/webm;base64,${audioData}`
    : '';

  if (!audioSrc) return null;

  return (
    <div className={`flex items-center gap-3 bg-slate-800/80 border border-slate-700/70 rounded-2xl px-3.5 py-2 select-none shadow-sm ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        preload="metadata"
      />
      <button
        type="button"
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all shrink-0 shadow-md active:scale-95"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs text-slate-300 font-medium mb-1">
          <span className="truncate flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            {title}
          </span>
          <span className="font-mono text-[11px] text-slate-400 shrink-0">
            {formatTime(currentTime)} / {formatTime(duration || audioRef.current?.duration || 0)}
          </span>
        </div>

        {/* Animated wave bars */}
        <div className="flex items-center gap-0.5 h-3">
          {[40, 75, 55, 90, 60, 80, 45, 95, 70, 50, 85, 65, 90, 75, 60, 40].map((heightPct, idx) => {
            const barProgress = (idx / 16);
            const totalDur = (duration || audioRef.current?.duration || 1);
            const isPassed = (currentTime / totalDur) >= barProgress;
            return (
              <div
                key={idx}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isPassed ? 'bg-indigo-400' : 'bg-slate-700'
                } ${isPlaying ? 'animate-pulse' : ''}`}
                style={{
                  height: `${heightPct}%`,
                  animationDelay: `${idx * 60}ms`,
                }}
              />
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            setCurrentTime(0);
          }
        }}
        className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
        title="Restart"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
