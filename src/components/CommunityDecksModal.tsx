import { useState, useEffect } from 'react';
import {
  Search, Globe, Sparkles, Star, Download, Heart,
  ShieldCheck, Loader2, ArrowRight, AlertCircle, RotateCw, ArrowUpDown, X
} from 'lucide-react';
import { CommunityDeck } from '../types';
import { CommunityDeckPreviewModal } from './CommunityDeckPreviewModal';
import { Skin } from '../utils/skins';

interface CommunityDecksModalProps {
  onImportDeck: (communityDeck: CommunityDeck) => void;
  userDeckTitles: string[];
  activeSkin?: Skin;
}

export function CommunityDecksModal({ onImportDeck, userDeckTitles, activeSkin }: CommunityDecksModalProps) {
  const [decks, setDecks] = useState<CommunityDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('popular');

  const surfaceBg = activeSkin?.colors.surface || '#0f172a';
  const surfaceHover = activeSkin?.colors.surfaceHover || '#1e293b';
  const borderColor = activeSkin?.colors.border || '#1e293b';
  const textPrimary = activeSkin?.colors.textPrimary || '#f8fafc';
  const textSecondary = activeSkin?.colors.textSecondary || '#94a3b8';
  const textMuted = activeSkin?.colors.textMuted || '#64748b';
  const accentColor = activeSkin?.colors.accent || '#6366f1';
  const accentText = activeSkin?.colors.accentText || '#ffffff';
  const accentGlow = activeSkin?.colors.accentGlow || 'rgba(99, 102, 241, 0.4)';

  // Preview modal
  const [selectedDeckForPreview, setSelectedDeckForPreview] = useState<CommunityDeck | null>(null);

  // AI-Assisted Discovery state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiDiscovering, setAiDiscovering] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDiscoveryResult, setAiDiscoveryResult] = useState<{
    recommendationSummary: string;
    recommendedDeckIds: string[];
    studyModules: { title: string; focus: string; cardTarget: string }[];
    sampleCards?: any[];
  } | null>(null);

  const fetchDecks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchQuery,
        category,
        sortBy,
      });
      const res = await fetch(`/api/community/decks?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.decks) {
        setDecks(data.decks);
      }
    } catch (err) {
      console.error('Error loading community decks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecks();
  }, [category, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDecks();
  };

  const handleAiDiscover = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiPrompt.trim()) return;

    setAiDiscovering(true);
    setAiDiscoveryResult(null);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/discover-decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userGoal: aiPrompt,
          currentDecks: userDeckTitles,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to curate study roadmap.');
      }
      if (data.discovery) {
        setAiDiscoveryResult(data.discovery);
      }
    } catch (err: any) {
      console.error('Error discovering decks with AI:', err);
      let message = err.message || 'AI discovery failed. Please try again.';
      try {
        if (message.includes('{') && message.includes('}')) {
          const jsonStart = message.indexOf('{');
          const jsonEnd = message.lastIndexOf('}');
          const parsed = JSON.parse(message.substring(jsonStart, jsonEnd + 1));
          if (parsed?.error?.message) {
            message = parsed.error.message;
          }
        }
      } catch {}
      if (
        message.includes('503') ||
        message.includes('high demand') ||
        message.includes('UNAVAILABLE') ||
        message.includes('spikes in demand')
      ) {
        message = 'The AI service is experiencing temporary high demand. Please try again in a few moments.';
      }
      setAiError(message);
    } finally {
      setAiDiscovering(false);
    }
  };

  const handleToggleLike = async (deckId: string) => {
    try {
      const res = await fetch(`/api/community/like/${deckId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDecks(prev =>
          prev.map(d => (d.id === deckId ? { ...d, likes: data.likes, userLiked: data.userLiked } : d))
        );
        if (selectedDeckForPreview && selectedDeckForPreview.id === deckId) {
          setSelectedDeckForPreview(prev => (prev ? { ...prev, likes: data.likes, userLiked: data.userLiked } : null));
        }
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const categories = ['All', 'Medicine', 'Languages', 'Computer Science', 'Science', 'Law'];

  return (
    <div className="space-y-5 max-w-4xl mx-auto px-4 py-4 pb-20 select-none">
      
      {/* Title & Community Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: textPrimary }}>
            <Globe className="w-5 h-5" style={{ color: accentColor }} />
            Cloud Deck Community
          </h1>
          <p className="text-xs mt-0.5" style={{ color: textSecondary }}>
            Discover peer-reviewed flashcards, versioned study packs, and AI-curated curriculum
          </p>
        </div>
      </div>

      {/* AI-Assisted Deck Discovery Bar */}
      <div
        className="border rounded-3xl p-4 shadow-xl transition-all"
        style={{
          backgroundColor: surfaceBg,
          borderColor: borderColor,
          boxShadow: `0 8px 30px -10px ${accentGlow}`,
        }}
      >
        <div className="flex items-center gap-2 text-xs font-bold mb-2" style={{ color: accentColor }}>
          <Sparkles className="w-4 h-4" />
          <span>AI-Assisted Deck Discovery</span>
        </div>
        
        <form onSubmit={handleAiDiscover} className="flex gap-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. 'I am preparing for JLPT N3 vocabulary' or 'USMLE cardiology murmurs'"
            className="flex-1 border rounded-2xl px-4 py-2.5 text-xs transition-all focus:outline-none"
            style={{
              backgroundColor: surfaceHover,
              borderColor: borderColor,
              color: textPrimary,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = accentColor;
              e.currentTarget.style.boxShadow = `0 0 0 2px ${accentGlow}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = borderColor;
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            type="submit"
            disabled={aiDiscovering || !aiPrompt.trim()}
            className="px-4 py-2.5 disabled:opacity-50 text-xs font-bold rounded-2xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
            style={{
              backgroundColor: accentColor,
              color: accentText,
              boxShadow: `0 3px 12px ${accentGlow}`,
            }}
          >
            {aiDiscovering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Curate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* AI Discovery Error Alert */}
        {aiError && (
          <div className="mt-3 p-3 bg-rose-950/60 border border-rose-800/70 rounded-2xl text-xs text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">{aiError}</p>
                <p className="text-[11px] text-rose-300/80 mt-0.5">
                  Spikes in demand are usually temporary. Automatic model fallback is enabled.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleAiDiscover()}
              disabled={aiDiscovering}
              className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shrink-0 transition-all active:scale-95"
            >
              {aiDiscovering ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCw className="w-3.5 h-3.5" />
              )}
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* AI Discovery Output Result */}
        {aiDiscoveryResult && (
          <div className="mt-4 pt-3 border-t space-y-3 animate-in fade-in" style={{ borderColor }}>
            <div className="border rounded-2xl p-3 text-xs" style={{ backgroundColor: surfaceHover, borderColor }}>
              <span className="font-semibold block mb-1" style={{ color: accentColor }}>AI Recommendation:</span>
              <p className="leading-relaxed" style={{ color: textSecondary }}>{aiDiscoveryResult.recommendationSummary}</p>
            </div>

            {/* Study Modules Roadmap */}
            {aiDiscoveryResult.studyModules && aiDiscoveryResult.studyModules.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: textMuted }}>
                  Recommended Study Breakdown
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {aiDiscoveryResult.studyModules.map((mod, idx) => (
                    <div key={idx} className="border p-2.5 rounded-xl text-xs" style={{ backgroundColor: surfaceHover, borderColor }}>
                      <span className="font-semibold block" style={{ color: textPrimary }}>{mod.title}</span>
                      <span className="text-[11px] mt-0.5 block" style={{ color: textSecondary }}>{mod.focus}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Search & List Organizer Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 w-full">
          {/* Dynamic Stretching Search Input */}
          <div
            className={`relative transition-all duration-300 ease-in-out ${
              isSearchFocused || searchQuery.trim().length > 0
                ? 'flex-[3] min-w-0'
                : 'flex-1 min-w-0'
            }`}
          >
            <Search className="w-4 h-4 absolute left-3.5 top-3 pointer-events-none transition-colors" style={{ color: textMuted }} />
            <input
              type="text"
              placeholder={isSearchFocused ? "Type to search community..." : "Search community decks, topics, tags..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  fetchDecks();
                }
              }}
              className="w-full border rounded-2xl pl-10 pr-8 py-2.5 text-xs transition-all focus:outline-none truncate"
              style={{
                backgroundColor: surfaceBg,
                borderColor: borderColor,
                color: textPrimary,
              }}
              onFocus={(e) => {
                setIsSearchFocused(true);
                e.currentTarget.style.borderColor = accentColor;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${accentGlow}`;
              }}
              onBlur={(e) => {
                setIsSearchFocused(false);
                e.currentTarget.style.borderColor = borderColor;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchDecks();
                }}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dynamic List Organizer Dropdown */}
          <div
            className={`flex items-center gap-1 border rounded-2xl px-2.5 py-2 text-[11px] font-semibold shrink-0 transition-all duration-300 ease-in-out shadow-xs ${
              isSearchFocused || searchQuery.trim().length > 0
                ? 'max-w-[110px] sm:max-w-[130px]'
                : 'max-w-[140px] sm:max-w-[165px]'
            }`}
            style={{
              backgroundColor: surfaceBg,
              borderColor: borderColor,
              color: textPrimary,
            }}
          >
            <ArrowUpDown className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
            <select
              value={category !== 'All' ? `cat:${category}` : sortBy}
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('cat:')) {
                  setCategory(val.replace('cat:', ''));
                } else {
                  setCategory('All');
                  setSortBy(val);
                }
              }}
              className="bg-transparent border-none focus:outline-none text-[11px] font-semibold cursor-pointer w-full truncate p-0"
              style={{ color: textPrimary }}
            >
              <optgroup label="Sort By">
                <option value="popular" style={{ backgroundColor: surfaceBg, color: textPrimary }}>Most Popular</option>
                <option value="rating" style={{ backgroundColor: surfaceBg, color: textPrimary }}>Highest Rated</option>
                <option value="newest" style={{ backgroundColor: surfaceBg, color: textPrimary }}>Recently Updated</option>
                <option value="likes" style={{ backgroundColor: surfaceBg, color: textPrimary }}>Most Liked</option>
              </optgroup>
              <optgroup label="Categories">
                {categories.map((cat) => (
                  <option
                    key={cat}
                    value={cat === 'All' ? 'popular' : `cat:${cat}`}
                    style={{ backgroundColor: surfaceBg, color: textPrimary }}
                  >
                    {cat === 'All' ? 'All Categories' : cat}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Decks Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-xs gap-2" style={{ color: textSecondary }}>
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: accentColor }} />
          <span>Syncing cloud community repository...</span>
        </div>
      ) : decks.length === 0 ? (
        <div
          className="text-center py-16 border rounded-3xl p-6"
          style={{
            backgroundColor: `${surfaceBg}80`,
            borderColor: borderColor,
          }}
        >
          <Globe className="w-10 h-10 mx-auto mb-3 opacity-40" style={{ color: accentColor }} />
          <h3 className="text-sm font-bold" style={{ color: textPrimary }}>No decks found</h3>
          <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: textSecondary }}>
            Try adjusting your search keywords or category filters, or use AI Deck Discovery above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="border rounded-3xl p-5 flex flex-col justify-between transition-all hover:shadow-xl group"
              style={{
                backgroundColor: surfaceBg,
                borderColor: borderColor,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = accentColor;
                e.currentTarget.style.boxShadow = `0 10px 25px -8px ${accentGlow}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = borderColor;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div>
                {/* Category & Version Badges */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      style={{
                        backgroundColor: `${accentColor}1a`,
                        color: accentColor,
                        borderColor: `${accentColor}33`,
                      }}
                    >
                      {deck.category}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border"
                      style={{
                        backgroundColor: surfaceHover,
                        borderColor: borderColor,
                        color: textSecondary,
                      }}
                    >
                      v{deck.version}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      {deck.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-amber-400 text-xs font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{deck.rating.toFixed(1)}</span>
                  </div>
                </div>

                <h3
                  className="text-base font-extrabold transition-colors tracking-tight line-clamp-1"
                  style={{ color: textPrimary }}
                >
                  {deck.title}
                </h3>
                <p
                  className="text-xs mt-1 line-clamp-2 leading-relaxed"
                  style={{ color: textSecondary }}
                >
                  {deck.description}
                </p>

                {/* Author badge */}
                <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: textSecondary }}>
                  <span className="text-[11px]" style={{ color: textMuted }}>By</span>
                  <span className="font-medium" style={{ color: textPrimary }}>{deck.author}</span>
                  {deck.sharingControl?.isVerified && (
                    <span title="Verified Creator">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer: Metrics & Preview Button */}
              <div
                className="pt-3 mt-4 border-t flex items-center justify-between"
                style={{ borderColor: borderColor }}
              >
                <div className="flex items-center gap-3 text-xs" style={{ color: textSecondary }}>
                  <span className="font-mono text-[11px]" style={{ color: textMuted }}>{deck.cardCount} cards</span>
                  <button
                    type="button"
                    onClick={() => handleToggleLike(deck.id)}
                    className={`flex items-center gap-1 hover:text-rose-400 transition-colors ${
                      deck.userLiked ? 'text-rose-400' : ''
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${deck.userLiked ? 'fill-rose-400' : ''}`} />
                    <span>{deck.likes}</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" />
                    <span>{deck.downloads}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDeckForPreview(deck)}
                  className="px-3.5 py-1.5 border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                  style={{
                    backgroundColor: surfaceHover,
                    borderColor: borderColor,
                    color: textPrimary,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = accentColor;
                    e.currentTarget.style.borderColor = accentColor;
                    e.currentTarget.style.color = accentText;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = surfaceHover;
                    e.currentTarget.style.borderColor = borderColor;
                    e.currentTarget.style.color = textPrimary;
                  }}
                >
                  <span>Preview & Review</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Explicit Deck Preview Modal */}
      <CommunityDeckPreviewModal
        isOpen={!!selectedDeckForPreview}
        onClose={() => setSelectedDeckForPreview(null)}
        deck={selectedDeckForPreview}
        onApproveImport={onImportDeck}
        onToggleLike={handleToggleLike}
        activeSkin={activeSkin}
      />
    </div>
  );
}
