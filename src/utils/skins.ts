/**
 * App Skins & Themes Configuration
 * Supports at least 10 distinct skins including Spotify (Black & Green),
 * OLED Pitch Black, Cyberpunk, Forest Matcha, Solar Light, etc.
 */

export interface Skin {
  id: string;
  name: string;
  tagline: string;
  mode: 'dark' | 'light';
  colors: {
    bg: string;
    surface: string;
    surfaceHover: string;
    border: string;
    accent: string;
    accentHover: string;
    accentText: string;
    accentGlow: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    swatches: [string, string, string]; // 3 colors for preview palette
  };
  classes: {
    appBg: string;
    card: string;
    cardHover: string;
    border: string;
    buttonPrimary: string;
    buttonSecondary: string;
    navBg: string;
    badge: string;
    chipActive: string;
  };
}

export const APP_SKINS: Skin[] = [
  {
    id: 'spotify',
    name: 'Spotify Noir',
    tagline: 'Deep Pitch Black & Electric Emerald Green',
    mode: 'dark',
    colors: {
      bg: '#000000',
      surface: '#121212',
      surfaceHover: '#181818',
      border: '#282828',
      accent: '#1DB954',
      accentHover: '#1ed760',
      accentText: '#000000',
      accentGlow: 'rgba(29, 185, 84, 0.4)',
      textPrimary: '#ffffff',
      textSecondary: '#b3b3b3',
      textMuted: '#6a6a6a',
      swatches: ['#000000', '#121212', '#1DB954'],
    },
    classes: {
      appBg: 'bg-black text-white',
      card: 'bg-[#121212] border-[#282828] text-white',
      cardHover: 'hover:bg-[#181818] hover:border-[#1DB954]/50',
      border: 'border-[#282828]',
      buttonPrimary: 'bg-[#1DB954] hover:bg-[#1ed760] text-black font-black shadow-lg shadow-[#1DB954]/30',
      buttonSecondary: 'bg-[#242424] hover:bg-[#2a2a2a] text-white border border-[#333]',
      navBg: 'bg-black/90 border-[#282828]',
      badge: 'bg-[#1DB954]/20 text-[#1DB954] border-[#1DB954]/40',
      chipActive: 'bg-[#1DB954] text-black font-bold',
    },
  },
  {
    id: 'oled-black',
    name: 'OLED Pitch Black',
    tagline: 'Pure Monochrome True Black & Silver Accents',
    mode: 'dark',
    colors: {
      bg: '#000000',
      surface: '#0d0d0d',
      surfaceHover: '#171717',
      border: '#262626',
      accent: '#ffffff',
      accentHover: '#e5e5e5',
      accentText: '#000000',
      accentGlow: 'rgba(255, 255, 255, 0.25)',
      textPrimary: '#fafafa',
      textSecondary: '#a3a3a3',
      textMuted: '#525252',
      swatches: ['#000000', '#171717', '#ffffff'],
    },
    classes: {
      appBg: 'bg-black text-neutral-100',
      card: 'bg-[#0d0d0d] border-neutral-800 text-neutral-100',
      cardHover: 'hover:bg-[#171717] hover:border-neutral-700',
      border: 'border-neutral-800',
      buttonPrimary: 'bg-white hover:bg-neutral-200 text-black font-black shadow-lg shadow-white/20',
      buttonSecondary: 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800',
      navBg: 'bg-black/95 border-neutral-900',
      badge: 'bg-neutral-800 text-neutral-200 border-neutral-700',
      chipActive: 'bg-white text-black font-bold',
    },
  },
  {
    id: 'slate-indigo',
    name: 'Nordic Indigo',
    tagline: 'Deep Midnight Slate with Cosmic Indigo Glow',
    mode: 'dark',
    colors: {
      bg: '#020617',
      surface: '#0f172a',
      surfaceHover: '#1e293b',
      border: '#1e293b',
      accent: '#6366f1',
      accentHover: '#4f46e5',
      accentText: '#ffffff',
      accentGlow: 'rgba(99, 102, 241, 0.4)',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      swatches: ['#020617', '#0f172a', '#6366f1'],
    },
    classes: {
      appBg: 'bg-slate-950 text-slate-100',
      card: 'bg-slate-900/90 border-slate-800 text-slate-100',
      cardHover: 'hover:bg-slate-800/80 hover:border-indigo-500/50',
      border: 'border-slate-800',
      buttonPrimary: 'bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-lg shadow-indigo-600/30',
      buttonSecondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
      navBg: 'bg-slate-950/90 border-slate-800',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      chipActive: 'bg-indigo-600 text-white font-bold',
    },
  },
  {
    id: 'forest-matcha',
    name: 'Forest & Matcha',
    tagline: 'Deep Alpine Forest with Soothing Matcha Green',
    mode: 'dark',
    colors: {
      bg: '#04140e',
      surface: '#0a261c',
      surfaceHover: '#0f382a',
      border: '#144634',
      accent: '#10b981',
      accentHover: '#059669',
      accentText: '#04140e',
      accentGlow: 'rgba(16, 185, 129, 0.4)',
      textPrimary: '#ecfdf5',
      textSecondary: '#a7f3d0',
      textMuted: '#6ee7b7',
      swatches: ['#04140e', '#0a261c', '#10b981'],
    },
    classes: {
      appBg: 'bg-[#04140e] text-emerald-50',
      card: 'bg-[#0a261c] border-[#144634] text-emerald-100',
      cardHover: 'hover:bg-[#0f382a] hover:border-emerald-500/50',
      border: 'border-[#144634]',
      buttonPrimary: 'bg-emerald-500 hover:bg-emerald-400 text-black font-black shadow-lg shadow-emerald-500/30',
      buttonSecondary: 'bg-[#0e3325] hover:bg-[#123e2d] text-emerald-200 border border-[#1a553f]',
      navBg: 'bg-[#04140e]/95 border-[#144634]',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      chipActive: 'bg-emerald-500 text-black font-bold',
    },
  },
  {
    id: 'cyber-neon',
    name: 'Cyberpunk Neon',
    tagline: 'High Voltage Obsidian & Electric Fuchsia Cyan',
    mode: 'dark',
    colors: {
      bg: '#0c0517',
      surface: '#180a2e',
      surfaceHover: '#260f47',
      border: '#381666',
      accent: '#d946ef',
      accentHover: '#c026d3',
      accentText: '#ffffff',
      accentGlow: 'rgba(217, 70, 239, 0.45)',
      textPrimary: '#fae8ff',
      textSecondary: '#d8b4fe',
      textMuted: '#a855f7',
      swatches: ['#0c0517', '#180a2e', '#d946ef'],
    },
    classes: {
      appBg: 'bg-[#0c0517] text-purple-100',
      card: 'bg-[#180a2e] border-[#381666] text-purple-100',
      cardHover: 'hover:bg-[#260f47] hover:border-fuchsia-500/50',
      border: 'border-[#381666]',
      buttonPrimary: 'bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:from-fuchsia-400 hover:to-cyan-400 text-white font-black shadow-lg shadow-fuchsia-500/30',
      buttonSecondary: 'bg-[#230f40] hover:bg-[#2d1452] text-fuchsia-200 border border-[#4a1f85]',
      navBg: 'bg-[#0c0517]/95 border-[#381666]',
      badge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
      chipActive: 'bg-fuchsia-500 text-white font-bold',
    },
  },
  {
    id: 'ocean-abyss',
    name: 'Ocean Abyss',
    tagline: 'Deep Mariana Navy & Caribbean Bioluminescent Cyan',
    mode: 'dark',
    colors: {
      bg: '#021324',
      surface: '#072540',
      surfaceHover: '#0b375d',
      border: '#104979',
      accent: '#06b6d4',
      accentHover: '#0891b2',
      accentText: '#021324',
      accentGlow: 'rgba(6, 182, 212, 0.4)',
      textPrimary: '#ecfeff',
      textSecondary: '#a5f3fc',
      textMuted: '#67e8f9',
      swatches: ['#021324', '#072540', '#06b6d4'],
    },
    classes: {
      appBg: 'bg-[#021324] text-cyan-50',
      card: 'bg-[#072540] border-[#104979] text-cyan-100',
      cardHover: 'hover:bg-[#0b375d] hover:border-cyan-400/50',
      border: 'border-[#104979]',
      buttonPrimary: 'bg-cyan-500 hover:bg-cyan-400 text-black font-black shadow-lg shadow-cyan-500/30',
      buttonSecondary: 'bg-[#0b375d] hover:bg-[#0e4370] text-cyan-200 border border-[#165891]',
      navBg: 'bg-[#021324]/95 border-[#104979]',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      chipActive: 'bg-cyan-500 text-black font-bold',
    },
  },
  {
    id: 'sunset-amber',
    name: 'Sunset & Amber',
    tagline: 'Warm Roasted Espresso & Golden Honey Glow',
    mode: 'dark',
    colors: {
      bg: '#170c08',
      surface: '#27150d',
      surfaceHover: '#3b2014',
      border: '#4d2919',
      accent: '#f59e0b',
      accentHover: '#d97706',
      accentText: '#170c08',
      accentGlow: 'rgba(245, 158, 11, 0.4)',
      textPrimary: '#fffbeb',
      textSecondary: '#fde68a',
      textMuted: '#f59e0b',
      swatches: ['#170c08', '#27150d', '#f59e0b'],
    },
    classes: {
      appBg: 'bg-[#170c08] text-amber-50',
      card: 'bg-[#27150d] border-[#4d2919] text-amber-100',
      cardHover: 'hover:bg-[#3b2014] hover:border-amber-500/50',
      border: 'border-[#4d2919]',
      buttonPrimary: 'bg-amber-500 hover:bg-amber-400 text-black font-black shadow-lg shadow-amber-500/30',
      buttonSecondary: 'bg-[#351b11] hover:bg-[#422216] text-amber-200 border border-[#5d311f]',
      navBg: 'bg-[#170c08]/95 border-[#4d2919]',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      chipActive: 'bg-amber-500 text-black font-bold',
    },
  },
  {
    id: 'crimson-dracula',
    name: 'Vampire Crimson',
    tagline: 'Midnight Velvet Charcoal & Blood Ruby Crimson',
    mode: 'dark',
    colors: {
      bg: '#14070a',
      surface: '#240e14',
      surfaceHover: '#38161f',
      border: '#4e1e2b',
      accent: '#e11d48',
      accentHover: '#be123c',
      accentText: '#ffffff',
      accentGlow: 'rgba(225, 29, 72, 0.45)',
      textPrimary: '#fff1f2',
      textSecondary: '#fecdd3',
      textMuted: '#fb7185',
      swatches: ['#14070a', '#240e14', '#e11d48'],
    },
    classes: {
      appBg: 'bg-[#14070a] text-rose-50',
      card: 'bg-[#240e14] border-[#4e1e2b] text-rose-100',
      cardHover: 'hover:bg-[#38161f] hover:border-rose-500/50',
      border: 'border-[#4e1e2b]',
      buttonPrimary: 'bg-rose-600 hover:bg-rose-500 text-white font-black shadow-lg shadow-rose-600/30',
      buttonSecondary: 'bg-[#31131c] hover:bg-[#3e1924] text-rose-200 border border-[#5e2334]',
      navBg: 'bg-[#14070a]/95 border-[#4e1e2b]',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      chipActive: 'bg-rose-600 text-white font-bold',
    },
  },
  {
    id: 'midnight-amethyst',
    name: 'Imperial Amethyst',
    tagline: 'Royal Obsidian Violet with Shimmering Lavender',
    mode: 'dark',
    colors: {
      bg: '#0e071a',
      surface: '#1c1033',
      surfaceHover: '#2b194d',
      border: '#3f2570',
      accent: '#a855f7',
      accentHover: '#9333ea',
      accentText: '#ffffff',
      accentGlow: 'rgba(168, 85, 247, 0.4)',
      textPrimary: '#faf5ff',
      textSecondary: '#e9d5ff',
      textMuted: '#c084fc',
      swatches: ['#0e071a', '#1c1033', '#a855f7'],
    },
    classes: {
      appBg: 'bg-[#0e071a] text-purple-50',
      card: 'bg-[#1c1033] border-[#3f2570] text-purple-100',
      cardHover: 'hover:bg-[#2b194d] hover:border-purple-400/50',
      border: 'border-[#3f2570]',
      buttonPrimary: 'bg-purple-600 hover:bg-purple-500 text-white font-black shadow-lg shadow-purple-600/30',
      buttonSecondary: 'bg-[#271647] hover:bg-[#321d5a] text-purple-200 border border-[#4e2e8a]',
      navBg: 'bg-[#0e071a]/95 border-[#3f2570]',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      chipActive: 'bg-purple-600 text-white font-bold',
    },
  },
  {
    id: 'matrix-terminal',
    name: 'Matrix Terminal',
    tagline: 'Cyberdeck Phosphor Green on Pure CRT Black',
    mode: 'dark',
    colors: {
      bg: '#020d05',
      surface: '#051f0b',
      surfaceHover: '#0a3013',
      border: '#114a1f',
      accent: '#22c55e',
      accentHover: '#16a34a',
      accentText: '#020d05',
      accentGlow: 'rgba(34, 197, 94, 0.45)',
      textPrimary: '#f0fdf4',
      textSecondary: '#bbf7d0',
      textMuted: '#4ade80',
      swatches: ['#020d05', '#051f0b', '#22c55e'],
    },
    classes: {
      appBg: 'bg-[#020d05] text-green-100 font-mono',
      card: 'bg-[#051f0b] border-[#114a1f] text-green-100',
      cardHover: 'hover:bg-[#0a3013] hover:border-green-500/50',
      border: 'border-[#114a1f]',
      buttonPrimary: 'bg-green-500 hover:bg-green-400 text-black font-black shadow-lg shadow-green-500/30',
      buttonSecondary: 'bg-[#082a10] hover:bg-[#0c3716] text-green-200 border border-[#165a27]',
      navBg: 'bg-[#020d05]/95 border-[#114a1f]',
      badge: 'bg-green-500/20 text-green-300 border-green-500/40',
      chipActive: 'bg-green-500 text-black font-bold',
    },
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold & Bronze',
    tagline: 'Warm Satin Mauve & Champagne Rose Highlights',
    mode: 'dark',
    colors: {
      bg: '#180b13',
      surface: '#291421',
      surfaceHover: '#3d1d31',
      border: '#542844',
      accent: '#fb7185',
      accentHover: '#f43f5e',
      accentText: '#180b13',
      accentGlow: 'rgba(251, 113, 133, 0.4)',
      textPrimary: '#fff1f2',
      textSecondary: '#fecdd3',
      textMuted: '#fb7185',
      swatches: ['#180b13', '#291421', '#fb7185'],
    },
    classes: {
      appBg: 'bg-[#180b13] text-pink-50',
      card: 'bg-[#291421] border-[#542844] text-pink-100',
      cardHover: 'hover:bg-[#3d1d31] hover:border-pink-400/50',
      border: 'border-[#542844]',
      buttonPrimary: 'bg-pink-400 hover:bg-pink-300 text-black font-black shadow-lg shadow-pink-400/30',
      buttonSecondary: 'bg-[#351a2b] hover:bg-[#432137] text-pink-200 border border-[#633051]',
      navBg: 'bg-[#180b13]/95 border-[#542844]',
      badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
      chipActive: 'bg-pink-400 text-black font-bold',
    },
  },
  {
    id: 'solar-clean',
    name: 'Solar Daylight',
    tagline: 'Crisp High-Contrast Paper & Deep Indigo Ink',
    mode: 'light',
    colors: {
      bg: '#f8fafc',
      surface: '#ffffff',
      surfaceHover: '#f1f5f9',
      border: '#e2e8f0',
      accent: '#4f46e5',
      accentHover: '#4338ca',
      accentText: '#ffffff',
      accentGlow: 'rgba(79, 70, 229, 0.2)',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      swatches: ['#f8fafc', '#ffffff', '#4f46e5'],
    },
    classes: {
      appBg: 'bg-slate-50 text-slate-900',
      card: 'bg-white border-slate-200 text-slate-900 shadow-sm',
      cardHover: 'hover:bg-slate-50 hover:border-indigo-400',
      border: 'border-slate-200',
      buttonPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md shadow-indigo-500/20',
      buttonSecondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300',
      navBg: 'bg-white/95 border-slate-200 shadow-sm',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      chipActive: 'bg-indigo-600 text-white font-bold',
    },
  },
  {
    id: 'paper-minimal',
    name: 'Editorial Cream',
    tagline: 'Warm Archival Paper & Terracotta Typography',
    mode: 'light',
    colors: {
      bg: '#faf6ee',
      surface: '#ffffff',
      surfaceHover: '#f5efe4',
      border: '#e8dfd1',
      accent: '#ea580c',
      accentHover: '#c2410c',
      accentText: '#ffffff',
      accentGlow: 'rgba(234, 88, 12, 0.22)',
      textPrimary: '#26221f',
      textSecondary: '#6e655c',
      textMuted: '#a3988c',
      swatches: ['#faf6ee', '#ffffff', '#ea580c'],
    },
    classes: {
      appBg: 'bg-[#faf6ee] text-[#26221f]',
      card: 'bg-white border-[#e8dfd1] text-[#26221f] shadow-sm',
      cardHover: 'hover:bg-[#fcfaf7] hover:border-[#ea580c]/50',
      border: 'border-[#e8dfd1]',
      buttonPrimary: 'bg-[#ea580c] hover:bg-[#c2410c] text-white font-black shadow-md shadow-[#ea580c]/25',
      buttonSecondary: 'bg-[#f4ecdf] hover:bg-[#ede2d1] text-[#4a423a] border border-[#dacfc0]',
      navBg: 'bg-[#faf6ee]/95 border-[#e8dfd1]',
      badge: 'bg-[#ea580c]/15 text-[#c2410c] border-[#ea580c]/30',
      chipActive: 'bg-[#ea580c] text-white font-bold',
    },
  },
  {
    id: 'nordic-frost',
    name: 'Glacial Frost',
    tagline: 'Arctic Crisp Ice & Radiant Deep Azure',
    mode: 'light',
    colors: {
      bg: '#f0f9ff',
      surface: '#ffffff',
      surfaceHover: '#e0f2fe',
      border: '#bae6fd',
      accent: '#0284c7',
      accentHover: '#0369a1',
      accentText: '#ffffff',
      accentGlow: 'rgba(2, 132, 199, 0.25)',
      textPrimary: '#082f49',
      textSecondary: '#0369a1',
      textMuted: '#38bdf8',
      swatches: ['#f0f9ff', '#ffffff', '#0284c7'],
    },
    classes: {
      appBg: 'bg-sky-50 text-sky-950',
      card: 'bg-white border-sky-200 text-sky-950 shadow-sm',
      cardHover: 'hover:bg-sky-50 hover:border-sky-400',
      border: 'border-sky-200',
      buttonPrimary: 'bg-sky-600 hover:bg-sky-700 text-white font-black shadow-md shadow-sky-600/20',
      buttonSecondary: 'bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300',
      navBg: 'bg-white/95 border-sky-200 shadow-sm',
      badge: 'bg-sky-100 text-sky-800 border-sky-300',
      chipActive: 'bg-sky-600 text-white font-bold',
    },
  },
];

export type SkinCategory = 'all' | 'oled-dark' | 'vibrant' | 'nature-minimal' | 'light';

export const SKIN_CATEGORIES: { id: SkinCategory; label: string; count?: number }[] = [
  { id: 'all', label: 'All Themes' },
  { id: 'oled-dark', label: 'OLED & Dark' },
  { id: 'vibrant', label: 'Vibrant & Neon' },
  { id: 'nature-minimal', label: 'Nature & Earth' },
  { id: 'light', label: 'Clean Daylight' },
];

export function getSkinsByCategory(category: SkinCategory): Skin[] {
  if (category === 'all') return APP_SKINS;
  if (category === 'light') return APP_SKINS.filter(s => s.mode === 'light');
  if (category === 'oled-dark') return APP_SKINS.filter(s => ['spotify', 'oled-black', 'matrix-terminal', 'ocean-abyss'].includes(s.id));
  if (category === 'vibrant') return APP_SKINS.filter(s => ['cyber-neon', 'midnight-amethyst', 'crimson-dracula', 'sunset-amber'].includes(s.id));
  if (category === 'nature-minimal') return APP_SKINS.filter(s => ['forest-matcha', 'rose-gold', 'slate-indigo'].includes(s.id));
  return APP_SKINS;
}

export type FontFamilyOption = 'modern' | 'serif' | 'mono' | 'geometric';
export type CornerRadiusOption = 'sharp' | 'refined' | 'fluid';
export type SurfaceStyleOption = 'solid' | 'glass' | 'oled-pure';
export type CardElevationOption = 'subtle' | 'glow' | 'deep';

export interface AppearanceSettings {
  skinId: string;
  customAccentColor?: string | null;
  fontFamily: FontFamilyOption;
  borderRadius: CornerRadiusOption;
  surfaceStyle: SurfaceStyleOption;
  cardElevation: CardElevationOption;
  soundEnabled: boolean;
}

export const POPULAR_ACCENT_PRESETS: { label: string; hex: string }[] = [
  { label: 'Spotify Emerald', hex: '#1DB954' },
  { label: 'Electric Mint', hex: '#10b981' },
  { label: 'Cyber Cyan', hex: '#06b6d4' },
  { label: 'Hyper Violet', hex: '#8b5cf6' },
  { label: 'Neon Magenta', hex: '#d946ef' },
  { label: 'Sunset Orange', hex: '#f97316' },
  { label: 'Sun Gold', hex: '#eab308' },
  { label: 'Rose Red', hex: '#f43f5e' },
  { label: 'Pure White', hex: '#ffffff' },
  { label: 'Ice Azure', hex: '#38bdf8' },
];

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  skinId: 'spotify',
  customAccentColor: null,
  fontFamily: 'modern',
  borderRadius: 'refined',
  surfaceStyle: 'solid',
  cardElevation: 'subtle',
  soundEnabled: true,
};

const APPEARANCE_STORAGE_KEY = 'recall_appearance_settings_v3';

export function loadAppearanceSettings(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_APPEARANCE, ...parsed };
    }
  } catch {}
  return DEFAULT_APPEARANCE;
}

export function saveAppearanceSettings(settings: AppearanceSettings): void {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(settings));
    localStorage.setItem(SKIN_STORAGE_KEY, settings.skinId);
  } catch (err) {
    console.warn('Could not save appearance settings', err);
  }
}

function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(99, 102, 241, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isColorLight(hex: string): boolean {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return false;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  // Perceived brightness formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65;
}

export function getEffectiveSkin(baseSkin: Skin, customAccent?: string | null): Skin {
  if (!customAccent) return baseSkin;
  const trimmed = customAccent.trim();
  if (!trimmed.startsWith('#') && !trimmed.startsWith('rgb')) return baseSkin;

  const accentText = isColorLight(trimmed) ? '#000000' : '#ffffff';
  const accentGlow = hexToRgba(trimmed, 0.45);

  return {
    ...baseSkin,
    colors: {
      ...baseSkin.colors,
      accent: trimmed,
      accentHover: trimmed,
      accentText,
      accentGlow,
      swatches: [baseSkin.colors.swatches[0], baseSkin.colors.swatches[1], trimmed],
    },
  };
}

const SKIN_STORAGE_KEY = 'recall_app_skin_v2';

export function getActiveSkin(): Skin {
  try {
    const appearance = loadAppearanceSettings();
    const found = APP_SKINS.find(s => s.id === appearance.skinId);
    const base = found || APP_SKINS[0];
    return getEffectiveSkin(base, appearance.customAccentColor);
  } catch {}
  return APP_SKINS[0]; // Default to Spotify Noir
}

export function setActiveSkin(skinId: string, customAccent?: string | null): Skin {
  const base = APP_SKINS.find(s => s.id === skinId) || APP_SKINS[0];
  const appearance = loadAppearanceSettings();
  const updated: AppearanceSettings = {
    ...appearance,
    skinId: base.id,
    customAccentColor: customAccent !== undefined ? customAccent : appearance.customAccentColor,
  };
  saveAppearanceSettings(updated);
  const effective = getEffectiveSkin(base, updated.customAccentColor);
  applyAppearanceToDOM(updated, effective);
  return effective;
}

export function applyAppearanceToDOM(appearance: AppearanceSettings, effectiveSkin: Skin) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Colors
  root.style.setProperty('--app-bg', effectiveSkin.colors.bg);
  root.style.setProperty('--app-surface', effectiveSkin.colors.surface);
  root.style.setProperty('--app-surface-hover', effectiveSkin.colors.surfaceHover);
  root.style.setProperty('--app-border', effectiveSkin.colors.border);
  root.style.setProperty('--app-accent', effectiveSkin.colors.accent);
  root.style.setProperty('--app-accent-hover', effectiveSkin.colors.accentHover);
  root.style.setProperty('--app-accent-text', effectiveSkin.colors.accentText);
  root.style.setProperty('--app-accent-glow', effectiveSkin.colors.accentGlow);
  root.style.setProperty('--app-text-primary', effectiveSkin.colors.textPrimary);
  root.style.setProperty('--app-text-secondary', effectiveSkin.colors.textSecondary);
  root.style.setProperty('--app-text-muted', effectiveSkin.colors.textMuted);

  // Font
  const fontMap: Record<FontFamilyOption, string> = {
    modern: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    serif: "'Merriweather', 'Georgia', 'Playfair Display', serif",
    mono: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
    geometric: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
  };
  root.style.setProperty('--app-font', fontMap[appearance.fontFamily] || fontMap.modern);

  // Radius
  const radiusMap: Record<CornerRadiusOption, string> = {
    sharp: '6px',
    refined: '16px',
    fluid: '26px',
  };
  root.style.setProperty('--app-radius', radiusMap[appearance.borderRadius] || '16px');

  // Surface mode attribute
  root.setAttribute('data-skin-mode', effectiveSkin.mode);
  root.setAttribute('data-skin-id', effectiveSkin.id);
  root.setAttribute('data-font', appearance.fontFamily);
  root.setAttribute('data-radius', appearance.borderRadius);
  root.setAttribute('data-surface', appearance.surfaceStyle);
  root.setAttribute('data-elevation', appearance.cardElevation);

  // Background style on body
  document.body.style.backgroundColor = effectiveSkin.colors.bg;
  document.body.style.color = effectiveSkin.colors.textPrimary;
  document.body.style.fontFamily = fontMap[appearance.fontFamily] || fontMap.modern;
}

/**
 * High-precision Synthesizer Haptic Audio for UI interactions
 */
export function playAppearanceFeedbackSound(type: 'click' | 'switch' | 'flip' | 'reset') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.start(now);
      osc.stop(now + 0.035);
    } else if (type === 'switch') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.07);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (type === 'flip') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.09);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'reset') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.setValueAtTime(350, now + 0.05);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch {}
}
