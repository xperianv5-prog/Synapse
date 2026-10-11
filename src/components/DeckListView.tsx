import { useState, useMemo } from 'react';
import {
  Plus, Search, PlayCircle, Layers, Sparkles, Settings,
  UploadCloud, Clock, Tag, ChevronRight, BookOpen, Palette, User,
  RotateCw, ArrowUpDown, X
} from 'lucide-react';
import { Deck, Flashcard } from '../types';
import { getAlgorithm } from '../algorithms/spacedRepetition';
import { Skin } from '../utils/skins';
import { UserProfile } from '../utils/auth';

export type DeckArrangementOption =
  | 'newest'
  | 'oldest'
  | 'alphabetical'
  | 'alphabetical-desc'
  | 'topic'
  | 'cards'
  | 'cards-asc'
  | 'due';

interface DeckListViewProps {
  decks: Deck[];
  cards: Flashcard[];
  onSelectDeck: (deck: Deck) => void;
  onStartReviewDeck: (deck: Deck) => void;
  onCreateDeck: (deckData: Partial<Deck>) => void;
  onOpenAiGenerator: (deck: Deck) => void;
  activeSkin: Skin;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenSkinSelector: () => void;
  onCycleSkin?: () => void;
  onOpenSettings?: () => void;
}

export function DeckListView({
  decks,
  cards,
  onSelectDeck,
  onStartReviewDeck,
  onCreateDeck,
  onOpenAiGenerator,
  activeSkin,
  user,
  onOpenAuth,
  onOpenProfile,
  onOpenSkinSelector,
  onCycleSkin,
  onOpenSettings,
}: DeckListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [arrangement, setArrangement] = useState<string>('newest');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New deck form states
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newDescription, setNewDescription] = useState('');
  const [newAlgorithm, setNewAlgorithm] = useState<'leitner' | 'sm2' | 'cram'>('leitner');

  // Compute due counts per deck
  const deckStats = useMemo(() => {
    const stats: Record<string, { total: number; due: number }> = {};
    decks.forEach(d => {
      const deckCards = cards.filter(c => c.deckId === d.id);
      const algo = getAlgorithm(d.algorithm);
      const due = deckCards.filter(c => algo.isDue(c)).length;
      stats[d.id] = { total: deckCards.length, due };
    });
    return stats;
  }, [decks, cards]);

  // Overall due count
  const totalDueCount = useMemo(() => {
    return Object.values(deckStats).reduce((acc, curr) => acc + curr.due, 0);
  }, [deckStats]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add('All');
    decks.forEach(d => set.add(d.category));
    return Array.from(set);
  }, [decks]);

  // Filtered & Sorted decks
  const filteredDecks = useMemo(() => {
    const list = decks.filter(d => {
      const matchesSearch =
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || d.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    return [...list].sort((a, b) => {
      if (arrangement === 'alphabetical') {
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      }
      if (arrangement === 'alphabetical-desc') {
        return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
      }
      if (arrangement === 'topic') {
        // Arrange by topic / category first, then by title
        const catCompare = a.category.localeCompare(b.category, undefined, { sensitivity: 'base' });
        if (catCompare !== 0) return catCompare;
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      }
      if (arrangement === 'cards') {
        const countA = deckStats[a.id]?.total ?? a.cardCount ?? 0;
        const countB = deckStats[b.id]?.total ?? b.cardCount ?? 0;
        if (countB !== countA) return countB - countA;
        return a.title.localeCompare(b.title);
      }
      if (arrangement === 'cards-asc') {
        const countA = deckStats[a.id]?.total ?? a.cardCount ?? 0;
        const countB = deckStats[b.id]?.total ?? b.cardCount ?? 0;
        if (countA !== countB) return countA - countB;
        return a.title.localeCompare(b.title);
      }
      if (arrangement === 'due') {
        const dueA = deckStats[a.id]?.due ?? 0;
        const dueB = deckStats[b.id]?.due ?? 0;
        if (dueB !== dueA) return dueB - dueA;
        return a.title.localeCompare(b.title);
      }
      if (arrangement === 'oldest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      }
      // 'newest' (default)
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [decks, searchQuery, selectedCategory, arrangement, deckStats]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onCreateDeck({
      title: newTitle.trim(),
      category: newCategory.trim() || 'General',
      description: newDescription.trim() || 'Created in Recall',
      algorithm: newAlgorithm,
      color: 'from-indigo-600 to-cyan-600',
    });

    setNewTitle('');
    setNewCategory('General');
    setNewDescription('');
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto px-4 py-3 pb-24 select-none">
      
      {/* Top App Bar with Logo & User Avatar combined on the left side */}
      <div className="flex items-center justify-between gap-3">
        {/* Combined Recall Logo & User Avatar */}
        <button
          type="button"
          onClick={user && user.id !== 'guest_user' ? onOpenProfile : onOpenAuth}
          className="group flex items-center gap-3 p-1.5 pr-3.5 -ml-1 rounded-2xl border transition-all text-left active:scale-98 hover:shadow-md"
          style={{
            backgroundColor: `${activeSkin.colors.surface}cc`,
            borderColor: activeSkin.colors.border,
          }}
          title={user && user.id !== 'guest_user' ? `${user.name} · Account & Cloud Sync` : 'Sign In to Recall'}
        >
          {/* Logo Badge combined with User Avatar */}
          <div className="relative shrink-0">
            {user && user.id !== 'guest_user' ? (
              <div className="relative">
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-10 h-10 rounded-2xl object-cover border-2 shadow-sm transition-transform group-hover:scale-105"
                  style={{ borderColor: activeSkin.colors.accent }}
                />
                <span
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-lg flex items-center justify-center text-[9px] font-black shadow-md border"
                  style={{
                    backgroundColor: activeSkin.colors.accent,
                    color: activeSkin.colors.accentText,
                    borderColor: activeSkin.colors.bg,
                  }}
                  title="Recall"
                >
                  R
                </span>
              </div>
            ) : (
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-base font-black shadow-md transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: activeSkin.colors.accent,
                    color: activeSkin.colors.accentText,
                    boxShadow: `0 4px 12px ${activeSkin.colors.accentGlow}`,
                  }}
                >
                  R
                </div>
                <span
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border text-[8px]"
                  style={{
                    backgroundColor: activeSkin.colors.surfaceHover,
                    borderColor: activeSkin.colors.border,
                    color: activeSkin.colors.textSecondary,
                  }}
                  title="Sign In"
                >
                  <User className="w-2.5 h-2.5" />
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-base sm:text-lg font-black tracking-tight" style={{ color: activeSkin.colors.textPrimary }}>
                Recall
              </span>
              {user && user.id !== 'guest_user' ? (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full truncate max-w-[100px]"
                  style={{
                    backgroundColor: `${activeSkin.colors.accent}20`,
                    color: activeSkin.colors.accent,
                  }}
                >
                  {user.name.split(' ')[0]}
                </span>
              ) : (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.2 rounded-md opacity-75"
                  style={{
                    backgroundColor: activeSkin.colors.surfaceHover,
                    color: activeSkin.colors.textSecondary,
                  }}
                >
                  Guest
                </span>
              )}
            </div>
            <p className="text-[11px] truncate" style={{ color: activeSkin.colors.textSecondary }}>
              {user && user.id !== 'guest_user' ? `${user.tier.toUpperCase()} · ${user.streakDays}d Streak` : 'Multimedia Spaced Repetition'}
            </p>
          </div>
        </button>

        {/* Right side controls: Settings & New Deck Buttons */}
        <div className="flex items-center gap-2">
          {/* Settings Button beside + New Deck */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-3 py-2 text-xs font-bold rounded-2xl border flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              style={{
                backgroundColor: activeSkin.colors.surface,
                borderColor: activeSkin.colors.border,
                color: activeSkin.colors.textPrimary,
              }}
              title="Settings & Appearance"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" style={{ color: activeSkin.colors.accent }} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}

          {/* New Deck Button */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold rounded-2xl shadow-lg flex items-center gap-1.5 transition-all active:scale-95"
            style={{
              backgroundColor: activeSkin.colors.accent,
              color: activeSkin.colors.accentText,
              boxShadow: `0 4px 14px ${activeSkin.colors.accentGlow}`,
            }}
          >
            <Plus className="w-4 h-4" />
            <span>New Deck</span>
          </button>
        </div>
      </div>

      {/* Search & List Organizer Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 w-full">
          {/* Dynamic Stretching Search Input */}
          <div
            className={`relative transition-all duration-300 ease-in-out ${
              isSearchFocused || searchQuery.trim().length > 0
                ? 'flex-[3] min-w-0'
                : 'flex-1 min-w-0'
            }`}
          >
            <Search
              className="w-4 h-4 absolute left-3.5 top-3 pointer-events-none transition-colors"
              style={{ color: activeSkin.colors.textMuted }}
            />
            <input
              type="text"
              placeholder={isSearchFocused ? "Type to filter decks by title, topic..." : "Search decks..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={(e) => {
                setIsSearchFocused(true);
                e.currentTarget.style.borderColor = activeSkin.colors.accent;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${activeSkin.colors.accentGlow}`;
              }}
              onBlur={(e) => {
                setIsSearchFocused(false);
                e.currentTarget.style.borderColor = activeSkin.colors.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
              className="w-full border rounded-2xl pl-10 pr-8 py-2.5 text-xs transition-all focus:outline-none truncate"
              style={{
                backgroundColor: activeSkin.colors.surface,
                borderColor: activeSkin.colors.border,
                color: activeSkin.colors.textPrimary,
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dynamic List Organizer Dropdown */}
          <div
            className={`flex items-center gap-1 border rounded-2xl px-2 py-1.5 text-[11px] font-semibold shrink-0 transition-all duration-300 ease-in-out shadow-sm ${
              isSearchFocused || searchQuery.trim().length > 0
                ? 'max-w-[105px] sm:max-w-[125px]'
                : 'max-w-[145px] sm:max-w-[170px]'
            }`}
            style={{
              backgroundColor: activeSkin.colors.surface,
              borderColor: activeSkin.colors.border,
              color: activeSkin.colors.textPrimary,
            }}
          >
            <ArrowUpDown className="w-3 h-3 shrink-0" style={{ color: activeSkin.colors.accent }} />
            <select
              value={selectedCategory !== 'All' ? `topic:${selectedCategory}` : arrangement}
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('topic:')) {
                  setSelectedCategory(val.replace('topic:', ''));
                } else if (val === 'topic-all') {
                  setSelectedCategory('All');
                } else {
                  setSelectedCategory('All');
                  setArrangement(val);
                }
              }}
              className="bg-transparent focus:outline-none cursor-pointer text-[11px] font-bold w-full truncate py-0.5"
              style={{ color: activeSkin.colors.textPrimary }}
              aria-label="Organize and sort decks"
            >
              <optgroup label="Sort By">
                <option value="newest" style={{ backgroundColor: activeSkin.colors.surface, color: activeSkin.colors.textPrimary }}>
                  Newest
                </option>
                <option value="alphabetical" style={{ backgroundColor: activeSkin.colors.surface, color: activeSkin.colors.textPrimary }}>
                  Name (A–Z)
                </option>
                <option value="due" style={{ backgroundColor: activeSkin.colors.surface, color: activeSkin.colors.textPrimary }}>
                  Due Cards
                </option>
                <option value="cards" style={{ backgroundColor: activeSkin.colors.surface, color: activeSkin.colors.textPrimary }}>
                  Most Cards
                </option>
              </optgroup>
              {categories.filter(c => c !== 'All').length > 0 && (
                <optgroup label="Filter Topic">
                  <option value="topic-all" style={{ backgroundColor: activeSkin.colors.surface, color: activeSkin.colors.textPrimary }}>
                    All Topics
                  </option>
                  {Array.from(new Set(categories.filter(c => c !== 'All'))).map(cat => (
                    <option
                      key={cat}
                      value={`topic:${cat}`}
                      style={{ backgroundColor: activeSkin.colors.surface, color: activeSkin.colors.textPrimary }}
                    >
                      {cat}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Decks Grid */}
      {filteredDecks.length === 0 ? (
        <div
          className="text-center py-12 border rounded-3xl p-6 mt-2 transition-all"
          style={{
            backgroundColor: `${activeSkin.colors.surface}90`,
            borderColor: activeSkin.colors.border,
          }}
        >
          <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" style={{ color: activeSkin.colors.accent }} />
          <h3 className="text-sm font-bold" style={{ color: activeSkin.colors.textPrimary }}>
            No decks found
          </h3>
          <p className="text-xs mt-1" style={{ color: activeSkin.colors.textSecondary }}>
            Try adjusting your search terms or create a new deck above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {filteredDecks.map((deck) => {
            const stats = deckStats[deck.id] || { total: 0, due: 0 };
            const algo = getAlgorithm(deck.algorithm);

            return (
              <div
                key={deck.id}
                onClick={() => onSelectDeck(deck)}
                className="border rounded-3xl p-5 cursor-pointer transition-all hover:shadow-xl group flex flex-col justify-between"
                style={{
                  backgroundColor: activeSkin.colors.surface,
                  borderColor: activeSkin.colors.border,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = activeSkin.colors.accent;
                  e.currentTarget.style.boxShadow = `0 10px 25px -8px ${activeSkin.colors.accentGlow}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = activeSkin.colors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  {/* Top badges */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors"
                        style={{
                          backgroundColor: `${activeSkin.colors.accent}1a`,
                          color: activeSkin.colors.accent,
                          borderColor: `${activeSkin.colors.accent}33`,
                        }}
                      >
                        {deck.category}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                        style={{
                          backgroundColor: activeSkin.colors.surfaceHover,
                          borderColor: activeSkin.colors.border,
                          color: activeSkin.colors.textSecondary,
                        }}
                      >
                        {algo.name}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[10px] font-mono"
                        style={{ color: activeSkin.colors.textMuted }}
                      >
                        v{deck.version || '1.0.0'}
                      </span>
                    </div>

                    {stats.due > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {stats.due} Due
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Up to date
                      </span>
                    )}
                  </div>

                  {/* Title and description */}
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartReviewDeck(deck);
                      }}
                      className="text-base font-extrabold transition-colors tracking-tight line-clamp-1 hover:underline cursor-pointer group-hover:text-indigo-400"
                      style={{ color: activeSkin.colors.textPrimary }}
                      title="Click title to start review"
                    >
                      {deck.title}
                    </h3>
                  </div>
                  <p
                    className="text-xs mt-1 line-clamp-2 leading-relaxed"
                    style={{ color: activeSkin.colors.textSecondary }}
                  >
                    {deck.description}
                  </p>
                </div>

                {/* Deck Footer Actions */}
                <div
                  className="pt-4 mt-3 border-t flex items-center justify-between"
                  style={{ borderColor: activeSkin.colors.border }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onSelectDeck(deck)}
                    className="text-xs font-mono font-medium hover:underline flex items-center gap-1"
                    style={{ color: activeSkin.colors.textMuted }}
                    title="View & manage cards in deck"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{stats.total} {stats.total === 1 ? 'card' : 'cards'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenAiGenerator(deck)}
                      className="p-1.5 rounded-xl transition-all border"
                      style={{
                        backgroundColor: activeSkin.colors.surfaceHover,
                        borderColor: activeSkin.colors.border,
                        color: activeSkin.colors.textSecondary,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = activeSkin.colors.accent;
                        e.currentTarget.style.borderColor = activeSkin.colors.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = activeSkin.colors.textSecondary;
                        e.currentTarget.style.borderColor = activeSkin.colors.border;
                      }}
                      title="Generate cards with AI from PDF"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onStartReviewDeck(deck)}
                      disabled={stats.total === 0}
                      className="px-3.5 py-1.5 disabled:opacity-40 text-xs font-bold rounded-xl flex items-center gap-1 shadow transition-all active:scale-95"
                      style={{
                        backgroundColor: activeSkin.colors.accent,
                        color: activeSkin.colors.accentText,
                        boxShadow: `0 3px 12px ${activeSkin.colors.accentGlow}`,
                      }}
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Study</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create New Deck Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="border w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 transition-colors"
            style={{
              backgroundColor: activeSkin.colors.surface,
              borderColor: activeSkin.colors.border,
              color: activeSkin.colors.textPrimary,
            }}
          >
            <h2 className="text-base font-bold mb-1" style={{ color: activeSkin.colors.textPrimary }}>
              Create New Flashcard Deck
            </h2>
            <p className="text-xs mb-4" style={{ color: activeSkin.colors.textSecondary }}>
              Organize your cards with a dedicated spaced repetition algorithm
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: activeSkin.colors.textSecondary }}>
                  Deck Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Chemistry Reactions"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none"
                  style={{
                    backgroundColor: activeSkin.colors.surfaceHover,
                    borderColor: activeSkin.colors.border,
                    color: activeSkin.colors.textPrimary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = activeSkin.colors.accent;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${activeSkin.colors.accentGlow}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = activeSkin.colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: activeSkin.colors.textSecondary }}>
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Science, Languages, Medicine"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none"
                  style={{
                    backgroundColor: activeSkin.colors.surfaceHover,
                    borderColor: activeSkin.colors.border,
                    color: activeSkin.colors.textPrimary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = activeSkin.colors.accent;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${activeSkin.colors.accentGlow}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = activeSkin.colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: activeSkin.colors.textSecondary }}>
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Brief note about target exam or topic"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none"
                  style={{
                    backgroundColor: activeSkin.colors.surfaceHover,
                    borderColor: activeSkin.colors.border,
                    color: activeSkin.colors.textPrimary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = activeSkin.colors.accent;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${activeSkin.colors.accentGlow}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = activeSkin.colors.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold" style={{ color: activeSkin.colors.textSecondary }}>
                  Algorithm Engine
                </label>
                <select
                  value={newAlgorithm}
                  onChange={(e) => setNewAlgorithm(e.target.value as any)}
                  className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors"
                  style={{
                    backgroundColor: activeSkin.colors.surfaceHover,
                    borderColor: activeSkin.colors.border,
                    color: activeSkin.colors.textPrimary,
                  }}
                >
                  <option value="leitner" style={{ backgroundColor: activeSkin.colors.surface, color: activeSkin.colors.textPrimary }}>
                    Leitner 5-Box (Visual milestone progression)
                  </option>
                  <option value="sm2" style={{ backgroundColor: activeSkin.colors.surface, color: activeSkin.colors.textPrimary }}>
                    SuperMemo SM-2 (Calculated ease & exponential intervals)
                  </option>
                  <option value="cram" style={{ backgroundColor: activeSkin.colors.surface, color: activeSkin.colors.textPrimary }}>
                    Cram Mode (Single-day intensive review)
                  </option>
                </select>
              </div>

              <div
                className="flex items-center justify-end gap-2 pt-3 border-t"
                style={{ borderColor: activeSkin.colors.border }}
              >
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold transition-colors"
                  style={{ color: activeSkin.colors.textSecondary }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = activeSkin.colors.textPrimary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = activeSkin.colors.textSecondary;
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95"
                  style={{
                    backgroundColor: activeSkin.colors.accent,
                    color: activeSkin.colors.accentText,
                    boxShadow: `0 4px 14px ${activeSkin.colors.accentGlow}`,
                  }}
                >
                  Create Deck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
