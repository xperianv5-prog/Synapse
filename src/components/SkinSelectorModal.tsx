import React, { useState, useMemo } from 'react';
import {
  X, Check, Palette, Sparkles, Type, Square, Layers,
  Volume2, VolumeX, RotateCw, Sun, Moon,
  Undo2, Compass
} from 'lucide-react';
import {
  APP_SKINS, Skin, SkinCategory, SKIN_CATEGORIES, getSkinsByCategory,
  AppearanceSettings, loadAppearanceSettings, saveAppearanceSettings,
  FontFamilyOption, CornerRadiusOption, SurfaceStyleOption, CardElevationOption,
  POPULAR_ACCENT_PRESETS, getEffectiveSkin, applyAppearanceToDOM,
  playAppearanceFeedbackSound, DEFAULT_APPEARANCE
} from '../utils/skins';

interface SkinSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSkin: Skin;
  onSelectSkin: (skinId: string, customAccent?: string | null) => void;
  appearanceSettings?: AppearanceSettings;
  onUpdateAppearance?: (newSettings: AppearanceSettings) => void;
}

export function SkinSelectorModal({
  isOpen,
  onClose,
  activeSkin,
  onSelectSkin,
  appearanceSettings: initialSettings,
  onUpdateAppearance,
}: SkinSelectorModalProps) {
  const [settings, setSettings] = useState<AppearanceSettings>(() => {
    return initialSettings || loadAppearanceSettings();
  });

  const [activeTab, setActiveTab] = useState<'themes' | 'typography' | 'surfaces' | 'accents'>('themes');
  const [selectedCategory, setSelectedCategory] = useState<SkinCategory>('all');
  const [previewFlipped, setPreviewFlipped] = useState(false);

  // Sync settings if initialSettings changes
  React.useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  // Compute live effective skin for preview
  const previewSkin = useMemo(() => {
    const base = APP_SKINS.find(s => s.id === settings.skinId) || activeSkin;
    return getEffectiveSkin(base, settings.customAccentColor);
  }, [settings.skinId, settings.customAccentColor, activeSkin]);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof AppearanceSettings>(key: K, val: AppearanceSettings[K]) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    saveAppearanceSettings(updated);

    const base = APP_SKINS.find(s => s.id === updated.skinId) || APP_SKINS[0];
    const eff = getEffectiveSkin(base, updated.customAccentColor);
    applyAppearanceToDOM(updated, eff);

    if (key === 'skinId' || key === 'customAccentColor') {
      onSelectSkin(updated.skinId, updated.customAccentColor);
    }
    if (onUpdateAppearance) {
      onUpdateAppearance(updated);
    }

    if (updated.soundEnabled) {
      playAppearanceFeedbackSound('click');
    }
  };

  const handleSelectSkinDirect = (skin: Skin) => {
    const updated: AppearanceSettings = {
      ...settings,
      skinId: skin.id,
      // If user had a custom accent, preserve or reset depending on preference
    };
    setSettings(updated);
    saveAppearanceSettings(updated);
    const eff = getEffectiveSkin(skin, updated.customAccentColor);
    applyAppearanceToDOM(updated, eff);
    onSelectSkin(skin.id, updated.customAccentColor);
    if (onUpdateAppearance) onUpdateAppearance(updated);

    if (updated.soundEnabled) {
      playAppearanceFeedbackSound('switch');
    }
  };

  const handleFlipPreview = () => {
    setPreviewFlipped(prev => !prev);
    if (settings.soundEnabled) {
      playAppearanceFeedbackSound('flip');
    }
  };

  const handleResetToDefaults = () => {
    setSettings(DEFAULT_APPEARANCE);
    saveAppearanceSettings(DEFAULT_APPEARANCE);
    const base = APP_SKINS.find(s => s.id === DEFAULT_APPEARANCE.skinId) || APP_SKINS[0];
    const eff = getEffectiveSkin(base, DEFAULT_APPEARANCE.customAccentColor);
    applyAppearanceToDOM(DEFAULT_APPEARANCE, eff);
    onSelectSkin(DEFAULT_APPEARANCE.skinId, DEFAULT_APPEARANCE.customAccentColor);
    if (onUpdateAppearance) onUpdateAppearance(DEFAULT_APPEARANCE);
    if (settings.soundEnabled) {
      playAppearanceFeedbackSound('reset');
    }
  };

  const filteredSkins = getSkinsByCategory(selectedCategory);

  // Derive preview styling from settings
  const previewRadiusClass = {
    sharp: 'rounded-md',
    refined: 'rounded-2xl',
    fluid: 'rounded-3xl',
  }[settings.borderRadius];

  const previewFontFamily = {
    modern: "'Plus Jakarta Sans', system-ui, sans-serif",
    serif: "'Georgia', 'Merriweather', serif",
    mono: "'JetBrains Mono', monospace",
    geometric: "'Plus Jakarta Sans', 'Inter', sans-serif",
  }[settings.fontFamily];

  const previewShadow = {
    subtle: '0 4px 12px rgba(0,0,0,0.15)',
    glow: `0 0 24px ${previewSkin.colors.accentGlow}`,
    deep: '0 20px 30px -10px rgba(0,0,0,0.6)',
  }[settings.cardElevation];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in select-none overflow-y-auto">
      <div
        className="relative w-full max-w-3xl my-auto rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors duration-200"
        style={{
          backgroundColor: previewSkin.colors.surface,
          borderColor: previewSkin.colors.border,
          color: previewSkin.colors.textPrimary,
          fontFamily: previewFontFamily,
        }}
      >
        {/* Top Header Bar */}
        <div
          className="p-5 pb-4 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: previewSkin.colors.border }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-all"
              style={{
                backgroundColor: previewSkin.colors.accent,
                color: previewSkin.colors.accentText,
                boxShadow: `0 4px 16px ${previewSkin.colors.accentGlow}`,
              }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight" style={{ color: previewSkin.colors.textPrimary }}>
                  Appearance & Design Studio
                </h2>
                <span
                  className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider"
                  style={{
                    backgroundColor: previewSkin.colors.accent,
                    color: previewSkin.colors.accentText,
                  }}
                >
                  {previewSkin.mode === 'dark' ? 'Dark Theme' : 'Light Theme'}
                </span>
              </div>
              <p className="text-xs" style={{ color: previewSkin.colors.textSecondary }}>
                Active: <span className="font-bold">{previewSkin.name}</span> • Customize palette, typography, curvature, and surface physics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefaults}
              title="Reset all settings to default"
              className="p-2 rounded-xl transition-all hover:opacity-80 flex items-center gap-1.5 text-xs font-semibold"
              style={{ backgroundColor: previewSkin.colors.surfaceHover, color: previewSkin.colors.textSecondary }}
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl transition-colors hover:opacity-80"
              style={{ backgroundColor: previewSkin.colors.surfaceHover }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Interactive Card Preview Section */}
        <div
          className="p-4 sm:p-5 border-b shrink-0 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{
            backgroundColor: previewSkin.colors.bg,
            borderColor: previewSkin.colors.border,
          }}
        >
          {/* Live Preview Card */}
          <div
            onClick={handleFlipPreview}
            className={`w-full md:w-80 cursor-pointer p-4 border transition-all duration-300 relative group select-none ${previewRadiusClass}`}
            style={{
              backgroundColor: settings.surfaceStyle === 'oled-pure' ? '#070707' : previewSkin.colors.surface,
              borderColor: settings.surfaceStyle === 'glass' ? previewSkin.colors.accent : previewSkin.colors.border,
              boxShadow: previewShadow,
              backdropFilter: settings.surfaceStyle === 'glass' ? 'blur(16px)' : undefined,
            }}
          >
            {/* Flip badge indicator */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md"
                  style={{
                    backgroundColor: `${previewSkin.colors.accent}25`,
                    color: previewSkin.colors.accent,
                    borderColor: `${previewSkin.colors.accent}50`,
                    borderWidth: 1,
                  }}
                >
                  {previewFlipped ? 'Back (Answer)' : 'Front (Prompt)'}
                </span>
                <span className="text-[10px] opacity-60">Deck Preview</span>
              </div>
              <div
                className="flex items-center gap-1 text-[10px] font-semibold opacity-70 group-hover:opacity-100 transition-opacity"
                style={{ color: previewSkin.colors.accent }}
              >
                <RotateCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-300" />
                <span>Tap to flip</span>
              </div>
            </div>

            {/* Card Content Mockup */}
            {!previewFlipped ? (
              <div className="space-y-2">
                <h4 className="text-sm sm:text-base font-bold leading-snug" style={{ color: previewSkin.colors.textPrimary }}>
                  What makes active recall and spaced repetition effective?
                </h4>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white/80 font-medium">
                    #neuroscience
                  </span>
                  <span className="text-[10px] opacity-60">Audio Enabled</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-semibold leading-relaxed" style={{ color: previewSkin.colors.textPrimary }}>
                  Retrieval practice strengthens neural synapses and interrupts the Ebbinghaus forgetting curve.
                </p>
                {/* Rating buttons mockup */}
                <div className="flex items-center gap-1.5 pt-2">
                  <span className="text-[10px] px-2 py-1 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                    Again (10m)
                  </span>
                  <span className="text-[10px] px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    Hard (1d)
                  </span>
                  <span
                    className="text-[10px] px-2 py-1 rounded font-bold"
                    style={{
                      backgroundColor: previewSkin.colors.accent,
                      color: previewSkin.colors.accentText,
                    }}
                  >
                    Good (3d)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Specs & Audio Toggle Info */}
          <div className="w-full md:flex-1 text-xs space-y-2 flex flex-col justify-center">
            <div className="flex items-center justify-between">
              <span className="font-bold" style={{ color: previewSkin.colors.textPrimary }}>
                Interactive Live Preview
              </span>
              <button
                type="button"
                onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all"
                style={{
                  borderColor: previewSkin.colors.border,
                  backgroundColor: settings.soundEnabled ? `${previewSkin.colors.accent}20` : previewSkin.colors.surface,
                  color: settings.soundEnabled ? previewSkin.colors.accent : previewSkin.colors.textSecondary,
                }}
              >
                {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{settings.soundEnabled ? 'Haptics Sound On' : 'Sound Muted'}</span>
              </button>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: previewSkin.colors.textSecondary }}>
              Any changes below are rendered instantly across the study canvas, review decks, buttons, and system chrome.
            </p>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div
          className="flex border-b overflow-x-auto no-scrollbar shrink-0 px-4 gap-1 text-xs font-bold"
          style={{ borderColor: previewSkin.colors.border }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('themes');
              if (settings.soundEnabled) playAppearanceFeedbackSound('click');
            }}
            className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'themes' ? 'border-current' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{ color: activeTab === 'themes' ? previewSkin.colors.accent : previewSkin.colors.textSecondary }}
          >
            <Compass className="w-4 h-4" />
            <span>Curated Themes ({APP_SKINS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('accents');
              if (settings.soundEnabled) playAppearanceFeedbackSound('click');
            }}
            className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'accents' ? 'border-current' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{ color: activeTab === 'accents' ? previewSkin.colors.accent : previewSkin.colors.textSecondary }}
          >
            <Sparkles className="w-4 h-4" />
            <span>Accent & Colors</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('typography');
              if (settings.soundEnabled) playAppearanceFeedbackSound('click');
            }}
            className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'typography' ? 'border-current' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{ color: activeTab === 'typography' ? previewSkin.colors.accent : previewSkin.colors.textSecondary }}
          >
            <Type className="w-4 h-4" />
            <span>Typography & Geometry</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('surfaces');
              if (settings.soundEnabled) playAppearanceFeedbackSound('click');
            }}
            className={`flex items-center gap-1.5 py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'surfaces' ? 'border-current' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{ color: activeTab === 'surfaces' ? previewSkin.colors.accent : previewSkin.colors.textSecondary }}
          >
            <Layers className="w-4 h-4" />
            <span>Surfaces & Glass</span>
          </button>
        </div>

        {/* Studio Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: CURATED THEMES */}
          {activeTab === 'themes' && (
            <div className="space-y-4">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {SKIN_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      if (settings.soundEnabled) playAppearanceFeedbackSound('click');
                    }}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat.id ? 'shadow-sm' : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: selectedCategory === cat.id ? previewSkin.colors.accent : previewSkin.colors.surfaceHover,
                      color: selectedCategory === cat.id ? previewSkin.colors.accentText : previewSkin.colors.textPrimary,
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Themes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredSkins.map((skin) => {
                  const isSelected = settings.skinId === skin.id;

                  return (
                    <div
                      key={skin.id}
                      onClick={() => handleSelectSkinDirect(skin)}
                      className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group active:scale-98 ${
                        isSelected ? 'ring-2' : 'hover:opacity-95'
                      }`}
                      style={{
                        backgroundColor: skin.colors.surface,
                        borderColor: isSelected ? previewSkin.colors.accent : skin.colors.border,
                        boxShadow: isSelected ? `0 0 16px ${previewSkin.colors.accentGlow}` : undefined,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black" style={{ color: skin.colors.textPrimary }}>
                              {skin.name}
                            </span>
                            {skin.id === 'spotify' && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#1DB954] text-black tracking-wider shadow-sm">
                                SPOTIFY NOIR
                              </span>
                            )}
                            {skin.id === 'oled-black' && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-white text-black tracking-wider">
                                OLED TRUE
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] line-clamp-1 mt-0.5" style={{ color: skin.colors.textSecondary }}>
                            {skin.tagline}
                          </p>
                        </div>

                        {isSelected ? (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow"
                            style={{
                              backgroundColor: previewSkin.colors.accent,
                              color: previewSkin.colors.accentText,
                            }}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div
                            className="w-4 h-4 rounded-full border opacity-40 group-hover:opacity-100 transition-opacity"
                            style={{ borderColor: skin.colors.border }}
                          />
                        )}
                      </div>

                      {/* Swatches & Mode Tag */}
                      <div className="mt-3 pt-2.5 border-t flex items-center justify-between" style={{ borderColor: skin.colors.border }}>
                        <div className="flex items-center gap-1.5">
                          {skin.colors.swatches.map((col, idx) => (
                            <div
                              key={idx}
                              className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: col }}
                            />
                          ))}
                        </div>

                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
                          style={{
                            backgroundColor: skin.mode === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
                            color: skin.colors.textPrimary,
                            border: `1px solid ${skin.colors.border}`,
                          }}
                        >
                          {skin.mode === 'dark' ? <Moon className="w-2.5 h-2.5" /> : <Sun className="w-2.5 h-2.5" />}
                          <span>{skin.mode === 'dark' ? 'Dark' : 'Daylight'}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ACCENTS & SIGNATURE COLORS */}
          {activeTab === 'accents' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold mb-1" style={{ color: previewSkin.colors.textPrimary }}>
                  Signature Accent Hue
                </h3>
                <p className="text-xs" style={{ color: previewSkin.colors.textSecondary }}>
                  Override the active skin's primary glow, buttons, highlight badges, and progress tracks with a custom signature color.
                </p>
              </div>

              {/* Popular Presets */}
              <div className="space-y-2">
                <span className="text-xs font-semibold opacity-80">Curated Vibrant Swatches</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {POPULAR_ACCENT_PRESETS.map((item) => {
                    const isActive = settings.customAccentColor?.toLowerCase() === item.hex.toLowerCase();
                    return (
                      <button
                        key={item.hex}
                        type="button"
                        onClick={() => updateSetting('customAccentColor', item.hex)}
                        className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition-all text-left ${
                          isActive ? 'ring-2' : 'hover:opacity-90'
                        }`}
                        style={{
                          backgroundColor: previewSkin.colors.surfaceHover,
                          borderColor: isActive ? item.hex : previewSkin.colors.border,
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded-full shrink-0 shadow-sm border border-white/30"
                          style={{ backgroundColor: item.hex }}
                        />
                        <div className="truncate">
                          <span className="text-xs font-bold block truncate" style={{ color: previewSkin.colors.textPrimary }}>
                            {item.label}
                          </span>
                          <span className="text-[10px] font-mono opacity-60 block">{item.hex}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Hex Picker & Clear */}
              <div
                className="p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3"
                style={{
                  backgroundColor: previewSkin.colors.surfaceHover,
                  borderColor: previewSkin.colors.border,
                }}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="accent-color-picker"
                    value={settings.customAccentColor || previewSkin.colors.accent}
                    onChange={(e) => updateSetting('customAccentColor', e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                  />
                  <div>
                    <span className="text-xs font-bold block" style={{ color: previewSkin.colors.textPrimary }}>
                      Custom Color Picker
                    </span>
                    <span className="text-[11px] opacity-70">
                      Pick any precise hex color from your display palette
                    </span>
                  </div>
                </div>

                {settings.customAccentColor && (
                  <button
                    type="button"
                    onClick={() => updateSetting('customAccentColor', null)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border transition-all"
                    style={{
                      borderColor: previewSkin.colors.border,
                      color: previewSkin.colors.textSecondary,
                    }}
                  >
                    Reset to Theme Default
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TYPOGRAPHY & GEOMETRY */}
          {activeTab === 'typography' && (
            <div className="space-y-6">
              {/* Font Family */}
              <div className="space-y-2.5">
                <div>
                  <h3 className="text-sm font-bold" style={{ color: previewSkin.colors.textPrimary }}>
                    Font Family & Typography Pair
                  </h3>
                  <p className="text-xs" style={{ color: previewSkin.colors.textSecondary }}>
                    Select the reading tone and typographic hierarchy for flashcard cards and system UI.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'modern' as FontFamilyOption,
                      title: 'Modern Sans (Plus Jakarta)',
                      tagline: 'Refined contemporary sans-serif with high readability',
                      sample: 'Active Recall & Spaced Repetition',
                      fontStyle: "'Plus Jakarta Sans', system-ui, sans-serif",
                    },
                    {
                      id: 'serif' as FontFamilyOption,
                      title: 'Editorial Serif (Merriweather / Georgia)',
                      tagline: 'Warm bookish typography for academic & literary study',
                      sample: 'Active Recall & Spaced Repetition',
                      fontStyle: "'Georgia', 'Merriweather', serif",
                    },
                    {
                      id: 'mono' as FontFamilyOption,
                      title: 'Code Monospace (JetBrains Mono)',
                      tagline: 'Engineered fixed-width matrix for technical flashcards',
                      sample: 'Active Recall & Spaced Repetition',
                      fontStyle: "'JetBrains Mono', monospace",
                    },
                    {
                      id: 'geometric' as FontFamilyOption,
                      title: 'Clean Geometric (Inter Style)',
                      tagline: 'Crisp, neutral, high-density interface feel',
                      sample: 'Active Recall & Spaced Repetition',
                      fontStyle: "'Plus Jakarta Sans', 'Inter', sans-serif",
                    },
                  ].map((fontItem) => {
                    const isSelected = settings.fontFamily === fontItem.id;
                    return (
                      <div
                        key={fontItem.id}
                        onClick={() => updateSetting('fontFamily', fontItem.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          isSelected ? 'ring-2' : 'hover:opacity-90'
                        }`}
                        style={{
                          backgroundColor: previewSkin.colors.surfaceHover,
                          borderColor: isSelected ? previewSkin.colors.accent : previewSkin.colors.border,
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold" style={{ color: previewSkin.colors.textPrimary }}>
                            {fontItem.title}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4" style={{ color: previewSkin.colors.accent }} />
                          )}
                        </div>
                        <p
                          className="text-sm font-semibold my-2 truncate"
                          style={{
                            color: previewSkin.colors.accent,
                            fontFamily: fontItem.fontStyle,
                          }}
                        >
                          {fontItem.sample}
                        </p>
                        <p className="text-[11px] opacity-70" style={{ color: previewSkin.colors.textSecondary }}>
                          {fontItem.tagline}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Corner Curvature */}
              <div className="space-y-2.5 pt-4 border-t" style={{ borderColor: previewSkin.colors.border }}>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: previewSkin.colors.textPrimary }}>
                    Card Corner Curvature
                  </h3>
                  <p className="text-xs" style={{ color: previewSkin.colors.textSecondary }}>
                    Tune the geometric corner radius of flashcards and action tiles.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'sharp' as CornerRadiusOption, label: 'Sharp Studio', radius: '6px', desc: 'Precise 6px' },
                    { id: 'refined' as CornerRadiusOption, label: 'Refined Standard', radius: '16px', desc: 'Balanced 16px' },
                    { id: 'fluid' as CornerRadiusOption, label: 'Fluid Pebble', radius: '26px', desc: 'Smooth 26px' },
                  ].map((rad) => {
                    const isSelected = settings.borderRadius === rad.id;
                    return (
                      <button
                        key={rad.id}
                        type="button"
                        onClick={() => updateSetting('borderRadius', rad.id)}
                        className={`p-3 border flex flex-col items-center justify-center text-center transition-all ${
                          isSelected ? 'ring-2' : 'hover:opacity-90'
                        }`}
                        style={{
                          borderRadius: rad.radius,
                          backgroundColor: previewSkin.colors.surfaceHover,
                          borderColor: isSelected ? previewSkin.colors.accent : previewSkin.colors.border,
                        }}
                      >
                        <Square className="w-5 h-5 mb-1" style={{ color: previewSkin.colors.accent }} />
                        <span className="text-xs font-bold block" style={{ color: previewSkin.colors.textPrimary }}>
                          {rad.label}
                        </span>
                        <span className="text-[10px] opacity-60 mt-0.5">{rad.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SURFACES & ATMOSPHERE */}
          {activeTab === 'surfaces' && (
            <div className="space-y-6">
              {/* Surface Treatment */}
              <div className="space-y-2.5">
                <div>
                  <h3 className="text-sm font-bold" style={{ color: previewSkin.colors.textPrimary }}>
                    Surface Treatment & Glassmorphism
                  </h3>
                  <p className="text-xs" style={{ color: previewSkin.colors.textSecondary }}>
                    Choose the optical texture of card containers and overlays.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'solid' as SurfaceStyleOption,
                      name: 'Solid Matte',
                      desc: 'Clean opaque surfaces with balanced contrast and zero optical distraction',
                    },
                    {
                      id: 'glass' as SurfaceStyleOption,
                      name: 'Frosted Glass',
                      desc: 'Translucent backdrop blur with subtle specular rim highlights',
                    },
                    {
                      id: 'oled-pure' as SurfaceStyleOption,
                      name: 'True OLED Pitch',
                      desc: 'Maximum black level depth with crisp hairline contrast edges',
                    },
                  ].map((surf) => {
                    const isSelected = settings.surfaceStyle === surf.id;
                    return (
                      <div
                        key={surf.id}
                        onClick={() => updateSetting('surfaceStyle', surf.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          isSelected ? 'ring-2' : 'hover:opacity-90'
                        }`}
                        style={{
                          backgroundColor: previewSkin.colors.surfaceHover,
                          borderColor: isSelected ? previewSkin.colors.accent : previewSkin.colors.border,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold" style={{ color: previewSkin.colors.textPrimary }}>
                            {surf.name}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4" style={{ color: previewSkin.colors.accent }} />
                          )}
                        </div>
                        <p className="text-[11px] leading-relaxed" style={{ color: previewSkin.colors.textSecondary }}>
                          {surf.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Elevation & Shadows */}
              <div className="space-y-2.5 pt-4 border-t" style={{ borderColor: previewSkin.colors.border }}>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: previewSkin.colors.textPrimary }}>
                    Card Shadow & Glow Elevation
                  </h3>
                  <p className="text-xs" style={{ color: previewSkin.colors.textSecondary }}>
                    Control the optical depth and ambient lighting behind cards.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'subtle' as CardElevationOption,
                      name: 'Subtle Flat',
                      desc: 'Soft minimal shadow that blends seamlessly with the background',
                    },
                    {
                      id: 'glow' as CardElevationOption,
                      name: 'Radiant Accent Glow',
                      desc: 'Atmospheric light cast in your active skin’s signature accent color',
                    },
                    {
                      id: 'deep' as CardElevationOption,
                      name: 'Spatial Deep Shadow',
                      desc: 'Pronounced depth perspective ideal for full-screen focus sessions',
                    },
                  ].map((elev) => {
                    const isSelected = settings.cardElevation === elev.id;
                    return (
                      <div
                        key={elev.id}
                        onClick={() => updateSetting('cardElevation', elev.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          isSelected ? 'ring-2' : 'hover:opacity-90'
                        }`}
                        style={{
                          backgroundColor: previewSkin.colors.surfaceHover,
                          borderColor: isSelected ? previewSkin.colors.accent : previewSkin.colors.border,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold" style={{ color: previewSkin.colors.textPrimary }}>
                            {elev.name}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4" style={{ color: previewSkin.colors.accent }} />
                          )}
                        </div>
                        <p className="text-[11px] leading-relaxed" style={{ color: previewSkin.colors.textSecondary }}>
                          {elev.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="p-4 px-6 border-t flex items-center justify-between shrink-0"
          style={{
            borderColor: previewSkin.colors.border,
            backgroundColor: previewSkin.colors.bg,
            color: previewSkin.colors.textSecondary,
          }}
        >
          <div className="text-xs flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: previewSkin.colors.accent }}
            />
            <span className="hidden sm:inline">Theme:</span>
            <span className="font-bold" style={{ color: previewSkin.colors.textPrimary }}>
              {previewSkin.name}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-2xl font-black text-xs shadow-lg transition-all active:scale-95"
            style={{
              backgroundColor: previewSkin.colors.accent,
              color: previewSkin.colors.accentText,
              boxShadow: `0 4px 14px ${previewSkin.colors.accentGlow}`,
            }}
          >
            Apply & Done
          </button>
        </div>
      </div>
    </div>
  );
}
