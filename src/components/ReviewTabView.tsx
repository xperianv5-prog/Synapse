import { useState, useMemo } from 'react';
import { Search, X, ArrowUpDown, Layers, PlayCircle, Sparkles } from 'lucide-react';
import { Deck, Flashcard } from '../types';
import { getAlgorithm } from '../algorithms/spacedRepetition';
import { Skin } from '../utils/skins';

interface ReviewTabViewProps {
  decks: Deck[];
  cards: Flashcard[];
  activeSkin: Skin;
  onStartReviewDeck: (deck: Deck) => void;
}

export function ReviewTabView({
  decks,
  cards,
  activeSkin,
  onStartReviewDeck,
}: ReviewTabViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortOption, setSortOption] = useState<'due' | 'name' | 'newest' | 'cards'>('due');

  // Compute due counts per deck
  const deckStats = useMemo(() => {
    return decks.map(deck => {
      const deckCards = cards.filter(c => c.deckId === deck.id);
      const algo = getAlgorithm(deck.algorithm);
      const dueCount = deckCards.filter(c => algo.isDue(c)).length;
      return {
        deck,
        cards: deckCards,
        algo,
        dueCount,
      };
    });
  }, [decks, cards]);

  // Filter and sort decks dynamically
  const filteredAndSortedDecks = useMemo(() => {
    let result = [...deckStats];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        item =>
          item.deck.title.toLowerCase().includes(q) ||
          item.deck.category?.toLowerCase().includes(q) ||
          item.deck.description?.toLowerCase().includes(q)
      );
    }

    // Sort by selected organizer option
    result.sort((a, b) => {
      if (sortOption === 'due') {
        return b.dueCount - a.dueCount || a.deck.title.localeCompare(b.deck.title);
      }
      if (sortOption === 'name') {
        return a.deck.title.localeCompare(b.deck.title);
      }
      if (sortOption === 'newest') {
        return new Date(b.deck.createdAt).getTime() - new Date(a.deck.createdAt).getTime();
      }
      if (sortOption === 'cards') {
        return b.cards.length - a.cards.length;
      }
      return 0;
    });

    return result;
  }, [deckStats, searchQuery, sortOption]);

  const totalDueCount = useMemo(() => {
    return deckStats.reduce((sum, item) => sum + item.dueCount, 0);
  }, [deckStats]);

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4 animate-in fade-in duration-200 overflow-y-auto max-h-[calc(100vh-130px)] pb-24 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: activeSkin.colors.textPrimary }}>
            Review Queue
          </h2>
          <p className="text-xs" style={{ color: activeSkin.colors.textSecondary }}>
            {totalDueCount > 0
              ? `${totalDueCount} cards due across ${deckStats.filter(d => d.dueCount > 0).length} decks`
              : 'All review decks up to date'}
          </p>
        </div>
        {totalDueCount > 0 && (
          <span
            className="px-2.5 py-1 rounded-xl text-xs font-bold border shadow-xs"
            style={{
              backgroundColor: 'rgba(244, 63, 94, 0.15)',
              borderColor: 'rgba(244, 63, 94, 0.35)',
              color: '#fb7185',
            }}
          >
            {totalDueCount} Due Now
          </span>
        )}
      </div>

      {/* Dynamic Search Bar & List Organizer */}
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
            placeholder={isSearchFocused ? "Type to filter review decks..." : "Search review queue..."}
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
            className="w-full border rounded-2xl pl-10 pr-8 py-2 text-xs transition-all focus:outline-none truncate"
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
              className="absolute right-3 top-2 text-slate-400 hover:text-slate-200 transition-colors p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dynamic Organizer Dropdown */}
        <div
          className={`flex items-center gap-1 border rounded-2xl px-2 py-1.5 text-[11px] font-semibold shrink-0 transition-all duration-300 ease-in-out shadow-xs ${
            isSearchFocused || searchQuery.trim().length > 0
              ? 'max-w-[105px] sm:max-w-[125px]'
              : 'max-w-[135px] sm:max-w-[160px]'
          }`}
          style={{
            backgroundColor: activeSkin.colors.surface,
            borderColor: activeSkin.colors.border,
            color: activeSkin.colors.textPrimary,
          }}
        >
          <ArrowUpDown className="w-3 h-3 shrink-0" style={{ color: activeSkin.colors.accent }} />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="bg-transparent focus:outline-none cursor-pointer text-[11px] font-bold w-full truncate py-0.5"
            style={{ color: activeSkin.colors.textPrimary }}
            aria-label="Organize review decks"
          >
            <option value="due" style={{ backgroundColor: activeSkin.colors.surface, color: activeSkin.colors.textPrimary }}>
              Most Due
            </option>
            <option value="name" style={{ backgroundColor: activeSkin.colors.surface, color: activeSkin.colors.textPrimary }}>
              Alphabetical
            </option>
            <option value="newest" style={{ backgroundColor: activeSkin.colors.surface, color: activeSkin.colors.textPrimary }}>
              Newest
            </option>
            <option value="cards" style={{ backgroundColor: activeSkin.colors.surface, color: activeSkin.colors.textPrimary }}>
              Total Cards
            </option>
          </select>
        </div>
      </div>

      {/* Review Decks Scrollable List */}
      <div className="space-y-2.5 text-left">
        {filteredAndSortedDecks.length === 0 ? (
          <div
            className="p-8 text-center border rounded-3xl"
            style={{
              backgroundColor: activeSkin.colors.surface,
              borderColor: activeSkin.colors.border,
              color: activeSkin.colors.textSecondary,
            }}
          >
            <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold" style={{ color: activeSkin.colors.textPrimary }}>
              {searchQuery ? 'No matching review decks' : 'No decks found'}
            </p>
            <p className="text-xs mt-1">
              {searchQuery ? 'Try another search phrase.' : 'Create or import a deck to begin reviewing.'}
            </p>
          </div>
        ) : (
          filteredAndSortedDecks.map(({ deck, cards: deckCards, algo, dueCount }) => {
            return (
              <div
                key={deck.id}
                onClick={() => onStartReviewDeck(deck)}
                className="p-3.5 border rounded-2xl cursor-pointer flex items-center justify-between transition-all hover:shadow-lg active:scale-98 group"
                style={{
                  backgroundColor: activeSkin.colors.surface,
                  borderColor: activeSkin.colors.border,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = activeSkin.colors.accent;
                  e.currentTarget.style.boxShadow = `0 4px 16px -4px ${activeSkin.colors.accentGlow}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = activeSkin.colors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                    style={{
                      backgroundColor: dueCount > 0 ? activeSkin.colors.accent : activeSkin.colors.surfaceHover,
                      color: dueCount > 0 ? activeSkin.colors.accentText : activeSkin.colors.textSecondary,
                    }}
                  >
                    <PlayCircle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span
                      className="text-sm font-bold block truncate group-hover:text-indigo-400 transition-colors"
                      style={{ color: activeSkin.colors.textPrimary }}
                    >
                      {deck.title}
                    </span>
                    <span className="text-xs truncate block" style={{ color: activeSkin.colors.textSecondary }}>
                      {deckCards.length} cards · {algo.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="px-2.5 py-1 rounded-xl text-xs font-bold border transition-all"
                    style={{
                      backgroundColor: dueCount > 0 ? 'rgba(244, 63, 94, 0.15)' : activeSkin.colors.surfaceHover,
                      borderColor: dueCount > 0 ? 'rgba(244, 63, 94, 0.35)' : activeSkin.colors.border,
                      color: dueCount > 0 ? '#fb7185' : activeSkin.colors.textSecondary,
                    }}
                  >
                    {dueCount > 0 ? `${dueCount} Due` : 'Complete'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
