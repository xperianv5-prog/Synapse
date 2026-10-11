import { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Signal } from 'lucide-react';
import { Skin } from '../utils/skins';

interface AndroidStatusBarProps {
  activeSkin?: Skin;
}

export function AndroidStatusBar({ activeSkin }: AndroidStatusBarProps) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="w-full text-xs px-6 py-2 flex items-center justify-between border-b select-none z-40 sticky top-0 backdrop-blur-md transition-colors"
      style={{
        backgroundColor: activeSkin ? `${activeSkin.colors.bg}e6` : 'rgba(2, 6, 23, 0.8)',
        borderColor: activeSkin?.colors.border || 'rgba(30, 41, 59, 0.6)',
        color: activeSkin?.colors.textSecondary || '#94a3b8',
      }}
    >
      <div className="font-semibold tracking-tight flex items-center gap-1.5" style={{ color: activeSkin?.colors.textPrimary || '#e2e8f0' }}>
        <span>{timeStr || '09:41'}</span>
        <span
          className="w-1.5 h-1.5 rounded-full inline-block animate-pulse"
          style={{ backgroundColor: activeSkin?.colors.accent || '#10b981' }}
        />
      </div>
      <div className="flex items-center gap-2.5">
        <Signal className="w-3.5 h-3.5" />
        <Wifi className="w-3.5 h-3.5" />
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono opacity-80">89%</span>
          <BatteryMedium className="w-4 h-4" style={{ color: activeSkin?.colors.accent || '#34d399' }} />
        </div>
      </div>
    </div>
  );
}
