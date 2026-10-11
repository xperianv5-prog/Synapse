import { useState } from 'react';
import {
  Palette, Sparkles, Settings as SettingsIcon, RotateCw, Check,
  Volume2, ShieldCheck, User, LogOut, ArrowRight, ArrowLeft,
  Sliders, Moon, Sun, Download, RefreshCw
} from 'lucide-react';
import { Skin, APP_SKINS } from '../utils/skins';
import { UserProfile } from '../utils/auth';
import { Deck, Flashcard } from '../types';

interface SettingsViewProps {
  activeSkin: Skin;
  user: UserProfile | null;
  decks: Deck[];
  cards: Flashcard[];
  onSelectSkin: (skinId: string) => void;
  onOpenSkinSelector: () => void;
  onCycleSkin?: () => void;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onResetData?: () => void;
  onBack?: () => void;
}

export function SettingsView({
  activeSkin,
  user,
  decks,
  cards,
  onSelectSkin,
  onOpenSkinSelector,
  onCycleSkin,
  onOpenProfile,
  onOpenAuth,
  onLogout,
  onResetData,
  onBack,
}: SettingsViewProps) {
  // Theme filter in inline changer
  const [themeFilter, setThemeFilter] = useState<'all' | 'dark' | 'light'>('all');

  // Study and Audio local preferences
  const [autoplayAudio, setAutoplayAudio] = useState(() => {
    return localStorage.getItem('recall_pref_autoplay_audio') === 'true';
  });
  const [cardFlipAnim, setCardFlipAnim] = useState(() => {
    return localStorage.getItem('recall_pref_card_flip') !== 'false';
  });
  const [defaultAlgorithm, setDefaultAlgorithm] = useState(() => {
    return localStorage.getItem('recall_pref_default_algo') || 'sm2';
  });
  const [dailyGoal, setDailyGoal] = useState(() => {
    return localStorage.getItem('recall_pref_daily_goal') || '25';
  });

  const toggleAutoplayAudio = () => {
    const next = !autoplayAudio;
    setAutoplayAudio(next);
    localStorage.setItem('recall_pref_autoplay_audio', String(next));
  };

  const toggleCardFlipAnim = () => {
    const next = !cardFlipAnim;
    setCardFlipAnim(next);
    localStorage.setItem('recall_pref_card_flip', String(next));
  };

  const handleAlgorithmChange = (val: string) => {
    setDefaultAlgorithm(val);
    localStorage.setItem('recall_pref_default_algo', val);
  };

  const handleDailyGoalChange = (val: string) => {
    setDailyGoal(val);
    localStorage.setItem('recall_pref_daily_goal', val);
  };

  const handleExportBackup = () => {
    const backupData = {
      appName: 'Recall Flashcards',
      exportedAt: new Date().toISOString(),
      decks,
      cards,
      version: '2.5.0',
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recall-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSkins = APP_SKINS.filter(skin => {
    if (themeFilter === 'all') return true;
    return skin.mode === themeFilter;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-28 space-y-6 select-none animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: activeSkin.colors.border }}>
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-2xl border flex items-center justify-center transition-all active:scale-95 shadow-sm mr-0.5"
              style={{
                backgroundColor: activeSkin.colors.surface,
                borderColor: activeSkin.colors.border,
                color: activeSkin.colors.textPrimary,
              }}
              title="Back to Decks"
              aria-label="Back to Decks"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-md shrink-0"
            style={{
              backgroundColor: activeSkin.colors.accent,
              color: activeSkin.colors.accentText,
              boxShadow: `0 4px 12px ${activeSkin.colors.accentGlow}`,
            }}
          >
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight" style={{ color: activeSkin.colors.textPrimary }}>
              Settings & Themes
            </h1>
            <p className="text-xs" style={{ color: activeSkin.colors.textSecondary }}>
              Custom appearance, spaced repetition engine & cloud sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all active:scale-95 shadow-sm"
              style={{
                backgroundColor: activeSkin.colors.surface,
                borderColor: activeSkin.colors.border,
                color: activeSkin.colors.textSecondary,
              }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          {/* Quick Theme Cycle Button */}
          {onCycleSkin && (
            <button
              type="button"
              onClick={onCycleSkin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all active:scale-95 shadow-sm"
              style={{
                backgroundColor: activeSkin.colors.surface,
                borderColor: activeSkin.colors.border,
                color: activeSkin.colors.accent,
              }}
              title="Quick switch to next theme"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Next Theme</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: THEME STUDIO & INLINE THEME CHANGER */}
      <section
        className="p-5 rounded-3xl border shadow-xl space-y-5 transition-all"
        style={{
          backgroundColor: activeSkin.colors.surface,
          borderColor: activeSkin.colors.border,
          boxShadow: `0 8px 30px -10px ${activeSkin.colors.accentGlow}`,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" style={{ color: activeSkin.colors.accent }} />
              <h2 className="text-sm font-black tracking-tight uppercase" style={{ color: activeSkin.colors.textPrimary }}>
                App Themes & Visual Appearance
              </h2>
            </div>
            <p className="text-xs mt-0.5" style={{ color: activeSkin.colors.textSecondary }}>
              Active Theme: <span className="font-bold" style={{ color: activeSkin.colors.accent }}>{activeSkin.name}</span> · {activeSkin.tagline}
            </p>
          </div>

          {/* Theme Button: Open Theme Studio / Appearance Modal */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSkinSelector}
              className="px-4 py-2 text-xs font-bold rounded-2xl shadow-lg flex items-center gap-2 transition-all active:scale-95 shrink-0"
              style={{
                backgroundColor: activeSkin.colors.accent,
                color: activeSkin.colors.accentText,
                boxShadow: `0 4px 14px ${activeSkin.colors.accentGlow}`,
              }}
              title="Open full Appearance Studio"
            >
              <Palette className="w-4 h-4" />
              <span>Theme Studio & Custom Colors</span>
            </button>
          </div>
        </div>

        {/* Current Active Theme Highlight Card with Live Preview */}
        <div
          className="p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{
            backgroundColor: `${activeSkin.colors.bg}cc`,
            borderColor: activeSkin.colors.border,
          }}
        >
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-sm font-black" style={{ color: activeSkin.colors.textPrimary }}>
                {activeSkin.name}
              </span>
              <span
                className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${activeSkin.colors.accent}25`,
                  color: activeSkin.colors.accent,
                  border: `1px solid ${activeSkin.colors.accent}40`,
                }}
              >
                {activeSkin.mode} mode
              </span>
            </div>
            <p className="text-xs" style={{ color: activeSkin.colors.textSecondary }}>
              Customizable font families, corner radius curves & atmospheric glow
            </p>
          </div>

          {/* Swatches & Mini Interactive Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 p-1.5 rounded-xl border" style={{ borderColor: activeSkin.colors.border, backgroundColor: activeSkin.colors.surface }}>
              {activeSkin.colors.swatches.map((color, i) => (
                <span
                  key={i}
                  className="w-5 h-5 rounded-lg border border-black/20 shadow-sm"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={onOpenSkinSelector}
              className="px-3 py-1.5 text-[11px] font-bold rounded-xl border transition-all hover:opacity-80 active:scale-95"
              style={{
                backgroundColor: activeSkin.colors.surfaceHover,
                borderColor: activeSkin.colors.border,
                color: activeSkin.colors.textPrimary,
              }}
            >
              Customize
            </button>
          </div>
        </div>

        {/* Theme Changer (Inline Theme Selector Grid) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold" style={{ color: activeSkin.colors.textPrimary }}>
              Quick Theme Changer ({filteredSkins.length} Themes)
            </span>

            {/* Filter Pills: All / Dark / Light */}
            <div className="flex items-center gap-1 border rounded-xl p-0.5" style={{ borderColor: activeSkin.colors.border, backgroundColor: activeSkin.colors.bg }}>
              <button
                type="button"
                onClick={() => setThemeFilter('all')}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                style={{
                  backgroundColor: themeFilter === 'all' ? activeSkin.colors.accent : 'transparent',
                  color: themeFilter === 'all' ? activeSkin.colors.accentText : activeSkin.colors.textSecondary,
                }}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setThemeFilter('dark')}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                style={{
                  backgroundColor: themeFilter === 'dark' ? activeSkin.colors.accent : 'transparent',
                  color: themeFilter === 'dark' ? activeSkin.colors.accentText : activeSkin.colors.textSecondary,
                }}
              >
                <Moon className="w-2.5 h-2.5" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setThemeFilter('light')}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                style={{
                  backgroundColor: themeFilter === 'light' ? activeSkin.colors.accent : 'transparent',
                  color: themeFilter === 'light' ? activeSkin.colors.accentText : activeSkin.colors.textSecondary,
                }}
              >
                <Sun className="w-2.5 h-2.5" />
                <span>Light</span>
              </button>
            </div>
          </div>

          {/* Theme Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {filteredSkins.map((skin) => {
              const isSelected = activeSkin.id === skin.id;
              return (
                <button
                  key={skin.id}
                  type="button"
                  onClick={() => onSelectSkin(skin.id)}
                  className="p-3 rounded-2xl border text-left flex flex-col justify-between gap-2.5 transition-all relative overflow-hidden group active:scale-95"
                  style={{
                    backgroundColor: skin.colors.surface,
                    borderColor: isSelected ? activeSkin.colors.accent : skin.colors.border,
                    boxShadow: isSelected ? `0 0 16px ${activeSkin.colors.accentGlow}` : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-1 w-full">
                    <span className="text-xs font-bold truncate" style={{ color: skin.colors.textPrimary }}>
                      {skin.name}
                    </span>
                    {isSelected && (
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: activeSkin.colors.accent,
                          color: activeSkin.colors.accentText,
                        }}
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  {/* 3 Color Swatches */}
                  <div className="flex items-center gap-1.5">
                    {skin.colors.swatches.map((color, idx) => (
                      <span
                        key={idx}
                        className="w-3.5 h-3.5 rounded-full border border-black/20"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <span
                      className="text-[9px] font-mono ml-auto opacity-70"
                      style={{ color: skin.colors.textSecondary }}
                    >
                      {skin.mode}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 2: SPACED REPETITION ENGINE PREFERENCES */}
      <section
        className="p-5 rounded-3xl border shadow-md space-y-4"
        style={{
          backgroundColor: activeSkin.colors.surface,
          borderColor: activeSkin.colors.border,
        }}
      >
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4" style={{ color: activeSkin.colors.accent }} />
          <h2 className="text-sm font-black tracking-tight uppercase" style={{ color: activeSkin.colors.textPrimary }}>
            Spaced Repetition & Study Queue
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Default Algorithm */}
          <div
            className="p-3.5 rounded-2xl border space-y-1.5"
            style={{
              backgroundColor: activeSkin.colors.bg,
              borderColor: activeSkin.colors.border,
            }}
          >
            <label className="text-xs font-bold block" style={{ color: activeSkin.colors.textPrimary }}>
              Default Spacing Engine
            </label>
            <p className="text-[11px]" style={{ color: activeSkin.colors.textSecondary }}>
              Algorithm applied to new decks created in Recall
            </p>
            <select
              value={defaultAlgorithm}
              onChange={(e) => handleAlgorithmChange(e.target.value)}
              className="w-full mt-1 border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
              style={{
                backgroundColor: activeSkin.colors.surface,
                borderColor: activeSkin.colors.border,
                color: activeSkin.colors.textPrimary,
              }}
            >
              <option value="sm2">SuperMemo SM-2 (Classical)</option>
              <option value="leitner">Leitner 5-Box System</option>
              <option value="fsrs">FSRS (Free Spaced Repetition Scheduler)</option>
              <option value="exponential">Exponential Decay Model</option>
            </select>
          </div>

          {/* Daily Card Goal */}
          <div
            className="p-3.5 rounded-2xl border space-y-1.5"
            style={{
              backgroundColor: activeSkin.colors.bg,
              borderColor: activeSkin.colors.border,
            }}
          >
            <label className="text-xs font-bold block" style={{ color: activeSkin.colors.textPrimary }}>
              Daily Study Card Target
            </label>
            <p className="text-[11px]" style={{ color: activeSkin.colors.textSecondary }}>
              Target review volume to maintain knowledge retention
            </p>
            <select
              value={dailyGoal}
              onChange={(e) => handleDailyGoalChange(e.target.value)}
              className="w-full mt-1 border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
              style={{
                backgroundColor: activeSkin.colors.surface,
                borderColor: activeSkin.colors.border,
                color: activeSkin.colors.textPrimary,
              }}
            >
              <option value="15">15 Cards / Day (Light)</option>
              <option value="25">25 Cards / Day (Recommended)</option>
              <option value="50">50 Cards / Day (Intensive)</option>
              <option value="100">100 Cards / Day (Exam Prep)</option>
            </select>
          </div>
        </div>
      </section>

      {/* SECTION 3: AUDIO & MULTIMEDIA PREFERENCES */}
      <section
        className="p-5 rounded-3xl border shadow-md space-y-4"
        style={{
          backgroundColor: activeSkin.colors.surface,
          borderColor: activeSkin.colors.border,
        }}
      >
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4" style={{ color: activeSkin.colors.accent }} />
          <h2 className="text-sm font-black tracking-tight uppercase" style={{ color: activeSkin.colors.textPrimary }}>
            Audio & Multimedia Controls
          </h2>
        </div>

        <div className="space-y-3">
          {/* Autoplay Audio Toggle */}
          <div
            className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer"
            style={{
              backgroundColor: activeSkin.colors.bg,
              borderColor: activeSkin.colors.border,
            }}
            onClick={toggleAutoplayAudio}
          >
            <div>
              <span className="text-xs font-bold block" style={{ color: activeSkin.colors.textPrimary }}>
                Auto-play Voice Pronunciations
              </span>
              <span className="text-[11px]" style={{ color: activeSkin.colors.textSecondary }}>
                Plays card audio recordings or text-to-speech automatically when card flips
              </span>
            </div>
            <div
              className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                autoplayAudio ? '' : 'bg-slate-700'
              }`}
              style={{
                backgroundColor: autoplayAudio ? activeSkin.colors.accent : undefined,
              }}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  autoplayAudio ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* 3D Card Flip Animation Toggle */}
          <div
            className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer"
            style={{
              backgroundColor: activeSkin.colors.bg,
              borderColor: activeSkin.colors.border,
            }}
            onClick={toggleCardFlipAnim}
          >
            <div>
              <span className="text-xs font-bold block" style={{ color: activeSkin.colors.textPrimary }}>
                Card 3D Flip Physics Animation
              </span>
              <span className="text-[11px]" style={{ color: activeSkin.colors.textSecondary }}>
                Smooth 3D gyroscope card rotation with realistic perspective
              </span>
            </div>
            <div
              className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                cardFlipAnim ? '' : 'bg-slate-700'
              }`}
              style={{
                backgroundColor: cardFlipAnim ? activeSkin.colors.accent : undefined,
              }}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  cardFlipAnim ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: ACCOUNT & CLOUD SYNC */}
      <section
        className="p-5 rounded-3xl border shadow-md space-y-4"
        style={{
          backgroundColor: activeSkin.colors.surface,
          borderColor: activeSkin.colors.border,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" style={{ color: activeSkin.colors.accent }} />
            <h2 className="text-sm font-black tracking-tight uppercase" style={{ color: activeSkin.colors.textPrimary }}>
              Account & Cloud Sync
            </h2>
          </div>

          {user && user.id !== 'guest_user' ? (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${activeSkin.colors.accent}20`,
                color: activeSkin.colors.accent,
              }}
            >
              Cloud Connected
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
              Local Guest Mode
            </span>
          )}
        </div>

        {user && user.id !== 'guest_user' ? (
          <div
            className="p-4 rounded-2xl border flex items-center justify-between gap-3"
            style={{
              backgroundColor: activeSkin.colors.bg,
              borderColor: activeSkin.colors.border,
            }}
          >
            <div className="flex items-center gap-3">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-12 h-12 rounded-2xl object-cover border-2 shadow-sm"
                style={{ borderColor: activeSkin.colors.accent }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: activeSkin.colors.textPrimary }}>
                    {user.name}
                  </span>
                  <span
                    className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-md"
                    style={{
                      backgroundColor: activeSkin.colors.accent,
                      color: activeSkin.colors.accentText,
                    }}
                  >
                    {user.tier}
                  </span>
                </div>
                <span className="text-xs block" style={{ color: activeSkin.colors.textSecondary }}>
                  {user.email}
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold mt-0.5 inline-block">
                  Streak: {user.streakDays} days
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenProfile}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hover:opacity-80 active:scale-95"
                style={{
                  backgroundColor: activeSkin.colors.surface,
                  borderColor: activeSkin.colors.border,
                  color: activeSkin.colors.textPrimary,
                }}
              >
                Profile
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-xl border transition-all hover:opacity-80 active:scale-95 text-rose-400"
                style={{
                  backgroundColor: activeSkin.colors.surface,
                  borderColor: activeSkin.colors.border,
                }}
                title="Sign out of Cloud Sync"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div
            className="p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{
              backgroundColor: activeSkin.colors.bg,
              borderColor: activeSkin.colors.border,
            }}
          >
            <div>
              <span className="text-xs font-bold block" style={{ color: activeSkin.colors.textPrimary }}>
                Sign In to Synchronize Across Devices
              </span>
              <span className="text-[11px]" style={{ color: activeSkin.colors.textSecondary }}>
                Backup your decks, track study streaks, and share community remakes
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
              style={{
                backgroundColor: activeSkin.colors.accent,
                color: activeSkin.colors.accentText,
                boxShadow: `0 4px 12px ${activeSkin.colors.accentGlow}`,
              }}
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In / Create Account</span>
            </button>
          </div>
        )}
      </section>

      {/* SECTION 5: DATA STORAGE & EXPORT */}
      <section
        className="p-5 rounded-3xl border shadow-md space-y-4"
        style={{
          backgroundColor: activeSkin.colors.surface,
          borderColor: activeSkin.colors.border,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4" style={{ color: activeSkin.colors.accent }} />
            <h2 className="text-sm font-black tracking-tight uppercase" style={{ color: activeSkin.colors.textPrimary }}>
              Data & Backup
            </h2>
          </div>
          <span className="text-xs font-mono" style={{ color: activeSkin.colors.textSecondary }}>
            {decks.length} Decks · {cards.length} Cards
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all hover:opacity-80 active:scale-95 shadow-sm"
            style={{
              backgroundColor: activeSkin.colors.surfaceHover,
              borderColor: activeSkin.colors.border,
              color: activeSkin.colors.textPrimary,
            }}
          >
            <Download className="w-3.5 h-3.5" style={{ color: activeSkin.colors.accent }} />
            <span>Export JSON Library Backup</span>
          </button>

          {onResetData && (
            <button
              type="button"
              onClick={onResetData}
              className="px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all hover:opacity-80 active:scale-95 opacity-70 hover:opacity-100"
              style={{
                backgroundColor: activeSkin.colors.bg,
                borderColor: activeSkin.colors.border,
                color: activeSkin.colors.textSecondary,
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore Sample Medical Decks</span>
            </button>
          )}
        </div>
      </section>

    </div>
  );
}
