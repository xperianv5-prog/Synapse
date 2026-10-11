import { useState, useEffect, useMemo, useRef } from 'react';
import {
  PlayCircle, Plus, Sparkles, Settings, UploadCloud, Search,
  ArrowLeft, ArrowUpDown, Volume2, Image as ImageIcon,
  Trash2, Edit3, Eye, CheckSquare, Square, Check, X, FolderInput,
  FolderPlus, Layers, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { Deck, Flashcard } from '../types';
import { getAlgorithm } from '../algorithms/spacedRepetition';
import { Skin } from '../utils/skins';
import { getCardFrontText, getCardBackText } from '../utils/cardHelpers';

interface DeckDetailViewProps {
  deck: Deck;
  cards: Flashcard[];
  availableDecks?: Deck[];
  activeSkin?: Skin;
  onBack: () => void;
  onStartReview: () => void;
  onOpenCardEditor: (cardToEdit?: Flashcard) => void;
  onDeleteCard: (cardId: string) => void;
  onBulkDeleteCards?: (cardIds: string[]) => void;
  onBulkMoveCards?: (cardIds: string[], targetDeckId: string) => void;
  onCreateDeckAndMove?: (cardIds: string[], newDeckTitle: string, newDeckCategory?: string) => void;
  onAddCards?: (cards: Partial<Flashcard>[]) => void;
  onOpenAiGenerator: () => void;
  onOpenPublish: () => void;
  onOpenSettings: () => void;
  onDeleteDeck?: (deckId: string) => void;
  initialEditMode?: boolean;
}

export function DeckDetailView({
  deck,
  cards,
  availableDecks = [],
  activeSkin,
  onBack,
  onStartReview,
  onOpenCardEditor,
  onDeleteCard,
  onBulkDeleteCards,
  onBulkMoveCards,
  onCreateDeckAndMove,
  onAddCards,
  onOpenAiGenerator,
  onOpenPublish,
  onOpenSettings,
  onDeleteDeck,
  initialEditMode = false,
}: DeckDetailViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [filterBox, setFilterBox] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [isEditingCardsMode, setIsEditingCardsMode] = useState(initialEditMode);
  const [isConfirmingDeleteDeck, setIsConfirmingDeleteDeck] = useState(false);

  // Synchronize when opened with initialEditMode flag
  useEffect(() => {
    setIsEditingCardsMode(initialEditMode);
  }, [initialEditMode]);

  // Quick AI Prompt State
  const [isQuickAiOpen, setIsQuickAiOpen] = useState(false);
  const [quickAiPrompt, setQuickAiPrompt] = useState('');
  const [isQuickAiGenerating, setIsQuickAiGenerating] = useState(false);
  const [quickAiError, setQuickAiError] = useState<string | null>(null);

  // Long press timer ref for card multi-select gesture
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startLongPress = (cardId: string) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        try { window.navigator.vibrate(50); } catch (_) {}
      }
      setIsSelectionMode(true);
      setSelectedCardIds((prev) => {
        const next = new Set(prev);
        next.add(cardId);
        return next;
      });
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Quick AI Generator handler
  const handleQuickAiGenerate = async () => {
    if (!quickAiPrompt.trim() || isQuickAiGenerating) return;
    setIsQuickAiGenerating(true);
    setQuickAiError(null);
    try {
      const res = await fetch('/api/ai/generate-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'topic',
          topic: quickAiPrompt.trim(),
          count: 5,
          deckTitle: deck.title,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.cards || data.cards.length === 0) {
        throw new Error(data.error || 'Failed to generate cards from prompt');
      }
      if (onAddCards) {
        onAddCards(data.cards);
      }
      setQuickAiPrompt('');
      setIsQuickAiOpen(false);
    } catch (err: any) {
      setQuickAiError(err.message || 'Error generating cards. Please try again.');
    } finally {
      setIsQuickAiGenerating(false);
    }
  };

  // Bulk Selection Mode States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  // Move Modal Internal States
  const [targetDeckId, setTargetDeckId] = useState<string>('');
  const [moveSearchQuery, setMoveSearchQuery] = useState('');
  const [isCreatingNewDeck, setIsCreatingNewDeck] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckCategory, setNewDeckCategory] = useState('');

  const algorithm = useMemo(() => getAlgorithm(deck.algorithm), [deck.algorithm]);

  // Calculate due cards count
  const dueCardsCount = useMemo(() => {
    return cards.filter(c => algorithm.isDue(c)).length;
  }, [cards, algorithm]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    cards.forEach(c => c.tags.forEach(t => set.add(t)));
    return Array.from(set);
  }, [cards]);

  // Filtered cards list
  const filteredCards = useMemo(() => {
    return cards.filter(c => {
      const matchesSearch =
        getCardFrontText(c).toLowerCase().includes(searchQuery.toLowerCase()) ||
        getCardBackText(c).toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesBox =
        filterBox === 'all'
          ? true
          : filterBox === 'due'
          ? algorithm.isDue(c)
          : filterBox.startsWith('tag:')
          ? c.tags.includes(filterBox.replace('tag:', ''))
          : String(c.leitnerBox || 1) === filterBox;

      const matchesTag = filterTag === 'all' ? true : c.tags.includes(filterTag);

      return matchesSearch && matchesBox && matchesTag;
    });
  }, [cards, searchQuery, filterBox, filterTag, algorithm]);

  // Other available decks for transfer (excluding current deck)
  const otherDecks = useMemo(() => {
    return availableDecks.filter(d => d.id !== deck.id);
  }, [availableDecks, deck.id]);

  const filteredOtherDecks = useMemo(() => {
    if (!moveSearchQuery.trim()) return otherDecks;
    return otherDecks.filter(d =>
      d.title.toLowerCase().includes(moveSearchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(moveSearchQuery.toLowerCase())
    );
  }, [otherDecks, moveSearchQuery]);

  // Auto-select first other deck if targetDeckId not set
  useMemo(() => {
    if (!targetDeckId && otherDecks.length > 0) {
      setTargetDeckId(otherDecks[0].id);
    }
  }, [otherDecks, targetDeckId]);

  // Bulk Selection Operations
  const handleToggleCardSelection = (cardId: string) => {
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const allFilteredSelected = useMemo(() => {
    if (filteredCards.length === 0) return false;
    return filteredCards.every(c => selectedCardIds.has(c.id));
  }, [filteredCards, selectedCardIds]);

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedCardIds(new Set());
    } else {
      setSelectedCardIds(new Set(filteredCards.map(c => c.id)));
    }
  };

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedCardIds(new Set());
  };

  const handleConfirmBulkDelete = () => {
    if (selectedCardIds.size === 0) return;
    const ids = Array.from(selectedCardIds);
    if (onBulkDeleteCards) {
      onBulkDeleteCards(ids);
    } else {
      ids.forEach(id => onDeleteCard(id));
    }
    setIsDeleteDialogOpen(false);
    handleExitSelectionMode();
  };

  const handleConfirmBulkMove = () => {
    if (selectedCardIds.size === 0) return;
    const ids = Array.from(selectedCardIds);
    if (isCreatingNewDeck) {
      if (!newDeckTitle.trim()) return;
      if (onCreateDeckAndMove) {
        onCreateDeckAndMove(ids, newDeckTitle.trim(), newDeckCategory.trim() || undefined);
      }
    } else {
      if (!targetDeckId) return;
      if (onBulkMoveCards) {
        onBulkMoveCards(ids, targetDeckId);
      }
    }
    setIsMoveModalOpen(false);
    setIsCreatingNewDeck(false);
    setNewDeckTitle('');
    setNewDeckCategory('');
    handleExitSelectionMode();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto px-4 py-3 pb-24 select-none">
      
      {/* Top Bar with Back, Title & Settings */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-2xl transition-all hover:opacity-80"
          style={{
            backgroundColor: activeSkin ? activeSkin.colors.surface : undefined,
            color: activeSkin ? activeSkin.colors.textSecondary : undefined,
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {/* Edit Mode Toggle Button */}
          <button
            type="button"
            onClick={() => setIsEditingCardsMode(!isEditingCardsMode)}
            className="px-3 py-1.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
            style={{
              backgroundColor: isEditingCardsMode ? (activeSkin?.colors.accent || '#6366f1') : (activeSkin ? activeSkin.colors.surface : undefined),
              borderColor: isEditingCardsMode ? (activeSkin?.colors.accent || '#6366f1') : (activeSkin ? activeSkin.colors.border : undefined),
              color: isEditingCardsMode ? (activeSkin?.colors.accentText || '#ffffff') : (activeSkin ? activeSkin.colors.accent : undefined),
            }}
            title={isEditingCardsMode ? 'Exit card editing mode' : 'Enter card editing mode'}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditingCardsMode ? 'Done Editing' : 'Edit Cards'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenPublish}
            className="p-2 rounded-2xl transition-all hover:opacity-80"
            style={{
              backgroundColor: activeSkin ? activeSkin.colors.surface : undefined,
              color: activeSkin ? activeSkin.colors.accent : undefined,
            }}
            title="Publish to Cloud Community"
          >
            <UploadCloud className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-2xl transition-all hover:opacity-80"
            style={{
              backgroundColor: activeSkin ? activeSkin.colors.surface : undefined,
              color: activeSkin ? activeSkin.colors.textSecondary : undefined,
            }}
            title="Deck Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          {onDeleteDeck && (
            <button
              type="button"
              onClick={() => setIsConfirmingDeleteDeck(true)}
              className="p-2 rounded-2xl transition-all hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 cursor-pointer active:scale-95"
              style={{
                backgroundColor: activeSkin ? activeSkin.colors.surface : undefined,
              }}
              title="Delete Deck"
              aria-label="Delete Deck"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Editing Mode Banner */}
      {isEditingCardsMode && (
        <div
          className="p-3.5 sm:p-4 rounded-3xl border shadow-xl flex items-center justify-between gap-3 text-xs animate-in fade-in"
          style={{
            backgroundColor: activeSkin ? `${activeSkin.colors.accent}15` : 'rgba(99, 102, 241, 0.1)',
            borderColor: activeSkin?.colors.accent || '#6366f1',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold block" style={{ color: activeSkin?.colors.textPrimary || '#ffffff' }}>
                Card Editing Mode Active
              </span>
              <span className="text-[11px]" style={{ color: activeSkin?.colors.textSecondary || '#cbd5e1' }}>
                Tap any card to edit, delete cards, or add new cards
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenCardEditor()}
            className="px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 shadow-md transition-all active:scale-95 shrink-0"
            style={{
              backgroundColor: activeSkin?.colors.accent || '#6366f1',
              color: activeSkin?.colors.accentText || '#ffffff',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Card</span>
          </button>
        </div>
      )}

      {/* Deck Hero Banner Card */}
      <div className={`p-6 rounded-3xl bg-gradient-to-br ${deck.color || 'from-indigo-600 to-cyan-600'} text-white shadow-xl relative overflow-hidden`}>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-md">
              {deck.category}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-md">
              {algorithm.name}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-black/20 backdrop-blur-md">
              v{deck.version || '1.0.0'}
            </span>
          </div>

          <h1
            onClick={onStartReview}
            className="text-xl sm:text-2xl font-black tracking-tight leading-tight cursor-pointer hover:underline flex items-center gap-2 group"
            title="Click title to start review session"
          >
            <span>{deck.title}</span>
            <PlayCircle className="w-5 h-5 inline-block opacity-80 group-hover:opacity-100 transition-opacity" />
          </h1>
          <p className="text-xs sm:text-sm text-white/80 line-clamp-2 max-w-lg">
            {deck.description}
          </p>

          <div className="flex items-center gap-4 pt-2 text-xs font-semibold">
            <span>{cards.length} Total Cards</span>
            <span className="text-emerald-200">{dueCardsCount} Due for Review</span>
          </div>
        </div>
      </div>

      {/* Primary Action Buttons - Compact & Dynamic */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onStartReview}
          disabled={cards.length === 0}
          className="flex-1 min-w-[150px] py-2.5 px-4 disabled:opacity-40 text-xs font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
          style={{
            backgroundColor: activeSkin ? activeSkin.colors.accent : '#4f46e5',
            color: activeSkin ? activeSkin.colors.accentText : '#ffffff',
            boxShadow: activeSkin ? `0 4px 14px ${activeSkin.colors.accentGlow}` : undefined,
          }}
        >
          <PlayCircle className="w-4 h-4" />
          <span>Study Queue ({dueCardsCount || cards.length})</span>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onOpenCardEditor()}
            className="py-1.5 px-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm w-[110px] min-w-[110px] max-w-[110px] shrink-0"
            style={{
              width: '110px',
              minWidth: '110px',
              maxWidth: '110px',
              backgroundColor: activeSkin ? activeSkin.colors.surface : '#0f172a',
              borderColor: activeSkin ? activeSkin.colors.border : '#1e293b',
              color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc',
            }}
            title="Add card manually"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" style={{ color: activeSkin ? activeSkin.colors.accent : undefined }} />
            <span className="whitespace-nowrap">Add Card</span>
          </button>

          <button
            type="button"
            onClick={() => setIsQuickAiOpen(!isQuickAiOpen)}
            className="py-1.5 px-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm w-[110px] min-w-[110px] max-w-[110px] shrink-0"
            style={{
              width: '110px',
              minWidth: '110px',
              maxWidth: '110px',
              backgroundColor: isQuickAiOpen ? `${activeSkin?.colors.accent || '#6366f1'}20` : (activeSkin ? activeSkin.colors.surface : '#0f172a'),
              borderColor: isQuickAiOpen ? (activeSkin?.colors.accent || '#6366f1') : (activeSkin ? activeSkin.colors.border : '#1e293b'),
              color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc',
            }}
            title="Prompt AI to generate flashcards"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="whitespace-nowrap">AI Prompt</span>
          </button>
        </div>
      </div>

      {/* Small Text Box for Prompting AI Card Creation */}
      {isQuickAiOpen && (
        <div
          className="p-3.5 rounded-2xl border shadow-xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            backgroundColor: activeSkin ? activeSkin.colors.surface : '#0f172a',
            borderColor: activeSkin ? activeSkin.colors.accent : '#6366f1',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc' }}>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Prompt AI to Create Flashcards</span>
            </div>
            <button
              type="button"
              onClick={() => setIsQuickAiOpen(false)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 5 questions on cell respiration, key medical terms..."
              value={quickAiPrompt}
              onChange={(e) => setQuickAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleQuickAiGenerate();
                }
              }}
              className="flex-1 border rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors"
              style={{
                backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : '#1e293b',
                borderColor: activeSkin ? activeSkin.colors.border : '#334155',
                color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc',
              }}
              disabled={isQuickAiGenerating}
              autoFocus
            />
            <button
              type="button"
              onClick={handleQuickAiGenerate}
              disabled={isQuickAiGenerating || !quickAiPrompt.trim()}
              className="px-3 py-2 disabled:opacity-40 text-xs font-bold rounded-xl shadow-md flex items-center gap-1 shrink-0 transition-all active:scale-95"
              style={{
                backgroundColor: activeSkin ? activeSkin.colors.accent : '#6366f1',
                color: activeSkin ? activeSkin.colors.accentText : '#ffffff',
              }}
            >
              {isQuickAiGenerating ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            {quickAiError ? (
              <span className="text-rose-400 font-medium">{quickAiError}</span>
            ) : (
              <span style={{ color: activeSkin ? activeSkin.colors.textMuted : '#64748b' }}>
                Type topic and hit Generate to add flashcards instantly
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setIsQuickAiOpen(false);
                onOpenAiGenerator();
              }}
              className="text-cyan-400 hover:underline font-semibold flex items-center gap-1 shrink-0 ml-auto"
            >
              <UploadCloud className="w-3 h-3" />
              <span>Full PDF Upload</span>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Search & List Organizer Bar matching DeckListView and ReviewTabView */}
      <div className="flex items-center gap-2 w-full pt-2">
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
            style={{ color: activeSkin ? activeSkin.colors.textMuted : '#64748b' }}
          />
          <input
            type="text"
            placeholder={isSearchFocused ? "Type to filter cards..." : "Search cards in this deck..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={(e) => {
              setIsSearchFocused(true);
              if (activeSkin) {
                e.currentTarget.style.borderColor = activeSkin.colors.accent;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${activeSkin.colors.accentGlow}`;
              }
            }}
            onBlur={(e) => {
              setIsSearchFocused(false);
              if (activeSkin) {
                e.currentTarget.style.borderColor = activeSkin.colors.border;
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
            className="w-full border rounded-2xl pl-10 pr-8 py-2.5 text-xs transition-all focus:outline-none truncate"
            style={{
              backgroundColor: activeSkin ? activeSkin.colors.surface : '#0f172a',
              borderColor: activeSkin ? activeSkin.colors.border : '#1e293b',
              color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc',
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
          className={`flex items-center gap-1 border rounded-2xl px-2.5 py-2 text-[11px] font-semibold shrink-0 transition-all duration-300 ease-in-out shadow-xs ${
            isSearchFocused || searchQuery.trim().length > 0
              ? 'max-w-[110px] sm:max-w-[130px]'
              : 'max-w-[140px] sm:max-w-[165px]'
          }`}
          style={{
            backgroundColor: activeSkin ? activeSkin.colors.surface : '#0f172a',
            borderColor: activeSkin ? activeSkin.colors.border : '#1e293b',
            color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc',
          }}
        >
          <ArrowUpDown className="w-3.5 h-3.5 shrink-0" style={{ color: activeSkin?.colors.accent || '#6366f1' }} />
          <select
            value={filterBox}
            onChange={(e) => setFilterBox(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-[11px] font-semibold cursor-pointer w-full truncate p-0"
            style={{ color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc' }}
          >
            <option value="all" className="bg-slate-900 text-slate-100">All Cards</option>
            <option value="due" className="bg-slate-900 text-slate-100">Due Now ({dueCardsCount})</option>
            {deck.algorithm === 'leitner' && (
              <>
                <option value="1" className="bg-slate-900 text-slate-100">Box 1 (Daily)</option>
                <option value="2" className="bg-slate-900 text-slate-100">Box 2</option>
                <option value="3" className="bg-slate-900 text-slate-100">Box 3</option>
                <option value="4" className="bg-slate-900 text-slate-100">Box 4</option>
                <option value="5" className="bg-slate-900 text-slate-100">Box 5 (Mastered)</option>
              </>
            )}
            {allTags.map(t => (
              <option key={t} value={`tag:${t}`} className="bg-slate-900 text-slate-100">#{t}</option>
            ))}
          </select>
        </div>

        {/* Toggle Bulk Selection Mode Button */}
        {cards.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (isSelectionMode) {
                handleExitSelectionMode();
              } else {
                setIsSelectionMode(true);
              }
            }}
            className="px-3 py-2.5 rounded-2xl text-xs font-bold border flex items-center gap-1.5 transition-all shrink-0 active:scale-95"
            style={{
              backgroundColor: isSelectionMode ? (activeSkin?.colors.accent || '#6366f1') : (activeSkin ? activeSkin.colors.surface : '#0f172a'),
              borderColor: isSelectionMode ? (activeSkin?.colors.accent || '#6366f1') : (activeSkin ? activeSkin.colors.border : '#1e293b'),
              color: isSelectionMode ? (activeSkin?.colors.accentText || '#ffffff') : (activeSkin ? activeSkin.colors.textPrimary : '#f8fafc'),
            }}
            title={isSelectionMode ? 'Cancel Selection' : 'Select Multiple Cards'}
          >
            <CheckSquare className="w-4 h-4" />
            <span className="hidden sm:inline">{isSelectionMode ? 'Cancel' : 'Select'}</span>
          </button>
        )}
      </div>

      {/* Sticky Bulk Action Control Bar when in selection mode */}
      {isSelectionMode && (
        <div
          className="p-3 sm:p-4 rounded-3xl border shadow-2xl flex flex-wrap items-center justify-between gap-3 sticky top-14 z-30 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            backgroundColor: activeSkin ? `${activeSkin.colors.surface}f5` : '#0f172af5',
            borderColor: activeSkin?.colors.accent || '#6366f1',
            boxShadow: activeSkin ? `0 10px 30px -8px ${activeSkin.colors.accentGlow}` : '0 10px 30px -8px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hover:opacity-80"
              style={{
                backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : '#1e293b',
                borderColor: activeSkin ? activeSkin.colors.border : '#334155',
                color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc',
              }}
            >
              {allFilteredSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              <span>{allFilteredSelected ? 'Deselect All' : 'Select All'}</span>
            </button>

            <span
              className="text-xs font-bold font-mono px-2.5 py-1 rounded-xl"
              style={{
                color: activeSkin?.colors.accent || '#818cf8',
                backgroundColor: activeSkin ? `${activeSkin.colors.accent}1f` : '#818cf81f',
              }}
            >
              {selectedCardIds.size} of {filteredCards.length} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMoveModalOpen(true)}
              disabled={selectedCardIds.size === 0}
              className="px-3.5 py-1.5 disabled:opacity-40 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              style={{
                backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : '#1e293b',
                borderColor: activeSkin ? activeSkin.colors.border : '#334155',
                color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc',
              }}
              title="Move selected cards to another deck"
            >
              <FolderInput className="w-3.5 h-3.5" style={{ color: activeSkin?.colors.accent }} />
              <span>Move</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={selectedCardIds.size === 0}
              className="px-3.5 py-1.5 disabled:opacity-40 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95 bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25"
              title="Delete selected cards"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete</span>
            </button>

            <button
              type="button"
              onClick={handleExitSelectionMode}
              className="px-2.5 py-1.5 rounded-xl hover:opacity-80 transition-all text-xs font-semibold"
              style={{ color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8' }}
              title="Exit selection mode"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Cards List */}
      <div className="space-y-2.5 pt-1">
        {filteredCards.length === 0 ? (
          <div
            className="text-center py-12 border rounded-3xl p-6"
            style={{
              backgroundColor: activeSkin ? `${activeSkin.colors.surface}80` : '#0f172a80',
              borderColor: activeSkin ? activeSkin.colors.border : '#1e293b',
            }}
          >
            <p className="text-xs font-medium" style={{ color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8' }}>
              No cards found matching your filter
            </p>
          </div>
        ) : (
          filteredCards.map((card) => {
            const isSelected = selectedCardIds.has(card.id);

            return (
              <div
                key={card.id}
                onTouchStart={() => startLongPress(card.id)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                onMouseDown={() => startLongPress(card.id)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onClick={() => {
                  if (isSelectionMode) {
                    handleToggleCardSelection(card.id);
                  } else if (isEditingCardsMode) {
                    onOpenCardEditor(card);
                  }
                }}
                className={`border rounded-2xl p-4 transition-all flex items-start justify-between gap-3 group select-none ${
                  isSelectionMode || isEditingCardsMode ? 'cursor-pointer' : 'hover:shadow-md'
                }`}
                style={{
                  backgroundColor: isSelected
                    ? (activeSkin ? `${activeSkin.colors.accent}14` : '#4f46e514')
                    : (activeSkin ? activeSkin.colors.surface : '#0f172a'),
                  borderColor: isSelected
                    ? (activeSkin?.colors.accent || '#6366f1')
                    : (activeSkin?.colors.border || '#1e293b'),
                  boxShadow: isSelected && activeSkin
                    ? `0 0 16px ${activeSkin.colors.accentGlow}`
                    : undefined,
                }}
              >
                {/* Selection Checkbox */}
                {isSelectionMode && (
                  <div className="pt-0.5 shrink-0">
                    <div
                      className="w-5 h-5 rounded-lg border flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: isSelected
                          ? (activeSkin?.colors.accent || '#6366f1')
                          : 'transparent',
                        borderColor: isSelected
                          ? (activeSkin?.colors.accent || '#6366f1')
                          : (activeSkin?.colors.border || '#475569'),
                        color: isSelected
                          ? (activeSkin?.colors.accentText || '#ffffff')
                          : 'transparent',
                      }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Meta pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {deck.algorithm === 'leitner' && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border"
                        style={{
                          backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : '#1e293b',
                          borderColor: activeSkin ? activeSkin.colors.border : '#334155',
                          color: activeSkin ? activeSkin.colors.accent : '#818cf8',
                        }}
                      >
                        Box {card.leitnerBox || 1}
                      </span>
                    )}
                    {card.interval !== undefined && card.interval > 0 && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-mono border"
                        style={{
                          backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : '#1e293b',
                          borderColor: activeSkin ? activeSkin.colors.border : '#334155',
                          color: '#34d399',
                        }}
                      >
                        {card.interval}d interval
                      </span>
                    )}
                    {card.front.media?.imageUrl && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> Image
                      </span>
                    )}
                    {card.front.media?.audioData && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                        <Volume2 className="w-3 h-3" /> Voice
                      </span>
                    )}
                  </div>

                  {/* Front question */}
                  <p className="text-sm font-bold line-clamp-2" style={{ color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc' }}>
                    {getCardFrontText(card)}
                  </p>

                  {/* Back answer preview */}
                  <p className="text-xs line-clamp-1" style={{ color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8' }}>
                    {getCardBackText(card)}
                  </p>

                  {/* Tags */}
                  {card.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {card.tags.map(t => (
                        <span key={t} className="text-[10px] opacity-60 font-mono">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions (Hidden during selection mode for clean bulk tapping) */}
                {!isSelectionMode && (
                  <div className="flex items-center gap-1.5 shrink-0 pt-1" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onOpenCardEditor(card)}
                      className="py-1 px-2.5 rounded-xl transition-all hover:opacity-80 text-xs font-bold border flex items-center justify-center gap-1.5 shrink-0 w-[88px]"
                      style={{
                        width: '88px',
                        backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : '#1e293b',
                        borderColor: activeSkin ? activeSkin.colors.border : '#334155',
                        color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc',
                      }}
                      title="Edit card"
                    >
                      <Edit3 className="w-3.5 h-3.5 shrink-0" style={{ color: activeSkin ? activeSkin.colors.accent : undefined }} />
                      <span className="whitespace-nowrap">Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCard(card.id)}
                      className="p-1.5 rounded-xl transition-all hover:opacity-80 text-rose-400"
                      style={{
                        backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : undefined,
                      }}
                      title="Delete card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm rounded-3xl p-5 border shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
            style={{
              backgroundColor: activeSkin ? activeSkin.colors.surface : '#0f172a',
              borderColor: activeSkin ? activeSkin.colors.border : '#1e293b',
              color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Delete {selectedCardIds.size} Cards?</h3>
                <p className="text-xs" style={{ color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8' }}>
                  Permanent removal from "{deck.title}"
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8' }}>
              Are you sure you want to permanently delete {selectedCardIds.size} selected {selectedCardIds.size === 1 ? 'card' : 'cards'}? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: activeSkin?.colors.border || '#1e293b' }}>
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl hover:opacity-80"
                style={{ color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {selectedCardIds.size} Cards</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Move to Deck Modal */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="w-full max-w-md max-h-[90vh] rounded-t-3xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            style={{
              backgroundColor: activeSkin ? activeSkin.colors.surface : '#0f172a',
              borderColor: activeSkin ? activeSkin.colors.border : '#1e293b',
              color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc',
            }}
          >
            {/* Header */}
            <div
              className="p-5 pb-3 border-b flex items-center justify-between shrink-0"
              style={{ borderColor: activeSkin?.colors.border || '#1e293b' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-2xl flex items-center justify-center border"
                  style={{
                    backgroundColor: activeSkin ? `${activeSkin.colors.accent}1f` : '#4f46e51f',
                    borderColor: activeSkin ? `${activeSkin.colors.accent}40` : '#4f46e540',
                    color: activeSkin?.colors.accent || '#818cf8',
                  }}
                >
                  <FolderInput className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Move {selectedCardIds.size} Flashcards</h3>
                  <p className="text-xs" style={{ color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8' }}>
                    From: <span className="font-semibold">{deck.title}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMoveModalOpen(false);
                  setIsCreatingNewDeck(false);
                }}
                className="p-1.5 rounded-full hover:opacity-80"
                style={{ color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Toggle existing deck vs new deck */}
              <div
                className="flex items-center gap-1.5 p-1 rounded-2xl border"
                style={{
                  backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : '#1e293b',
                  borderColor: activeSkin?.colors.border || '#334155',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsCreatingNewDeck(false)}
                  className="flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                  style={{
                    backgroundColor: !isCreatingNewDeck
                      ? (activeSkin?.colors.accent || '#6366f1')
                      : 'transparent',
                    color: !isCreatingNewDeck
                      ? (activeSkin?.colors.accentText || '#ffffff')
                      : (activeSkin ? activeSkin.colors.textSecondary : '#94a3b8'),
                    boxShadow: !isCreatingNewDeck && activeSkin ? `0 2px 8px ${activeSkin.colors.accentGlow}` : undefined,
                  }}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Existing Deck ({otherDecks.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewDeck(true)}
                  className="flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                  style={{
                    backgroundColor: isCreatingNewDeck
                      ? (activeSkin?.colors.accent || '#6366f1')
                      : 'transparent',
                    color: isCreatingNewDeck
                      ? (activeSkin?.colors.accentText || '#ffffff')
                      : (activeSkin ? activeSkin.colors.textSecondary : '#94a3b8'),
                    boxShadow: isCreatingNewDeck && activeSkin ? `0 2px 8px ${activeSkin.colors.accentGlow}` : undefined,
                  }}
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Create New Deck</span>
                </button>
              </div>

              {!isCreatingNewDeck ? (
                <div className="space-y-3">
                  {otherDecks.length > 3 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3" style={{ color: activeSkin?.colors.textMuted }} />
                      <input
                        type="text"
                        placeholder="Filter destination deck..."
                        value={moveSearchQuery}
                        onChange={(e) => setMoveSearchQuery(e.target.value)}
                        className="w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none"
                        style={{
                          backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : '#1e293b',
                          borderColor: activeSkin ? activeSkin.colors.border : '#334155',
                          color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc',
                        }}
                      />
                    </div>
                  )}

                  {filteredOtherDecks.length === 0 ? (
                    <div
                      className="text-center py-8 border rounded-2xl p-4 text-xs space-y-2"
                      style={{
                        borderColor: activeSkin?.colors.border || '#334155',
                        color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8',
                      }}
                    >
                      <Layers className="w-8 h-8 mx-auto opacity-50" style={{ color: activeSkin?.colors.accent }} />
                      <p className="font-semibold">No other decks found in your library.</p>
                      <button
                        type="button"
                        onClick={() => setIsCreatingNewDeck(true)}
                        className="text-xs font-bold underline transition-colors"
                        style={{ color: activeSkin?.colors.accent || '#818cf8' }}
                      >
                        Create a new deck to receive these cards
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {filteredOtherDecks.map((d) => {
                        const isTarget = targetDeckId === d.id;
                        return (
                          <div
                            key={d.id}
                            onClick={() => setTargetDeckId(d.id)}
                            className="p-3.5 border rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 shadow-sm hover:scale-[1.01]"
                            style={{
                              backgroundColor: isTarget
                                ? (activeSkin ? `${activeSkin.colors.accent}14` : '#4f46e514')
                                : (activeSkin ? activeSkin.colors.surfaceHover : '#1e293b'),
                              borderColor: isTarget
                                ? (activeSkin?.colors.accent || '#6366f1')
                                : (activeSkin?.colors.border || '#334155'),
                            }}
                          >
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className="px-2 py-0.2 text-[10px] font-bold rounded-full border"
                                  style={{
                                    backgroundColor: `${activeSkin?.colors.accent || '#6366f1'}18`,
                                    borderColor: `${activeSkin?.colors.accent || '#6366f1'}33`,
                                    color: activeSkin?.colors.accent || '#818cf8',
                                  }}
                                >
                                  {d.category}
                                </span>
                                <span className="text-[10px] font-mono" style={{ color: activeSkin?.colors.textMuted || '#94a3b8' }}>
                                  {d.cardCount || 0} cards
                                </span>
                              </div>
                              <h4 className="text-xs font-bold truncate" style={{ color: activeSkin?.colors.textPrimary || '#f8fafc' }}>
                                {d.title}
                              </h4>
                            </div>

                            <div
                              className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all"
                              style={{
                                borderColor: isTarget ? (activeSkin?.colors.accent || '#6366f1') : (activeSkin?.colors.border || '#475569'),
                                backgroundColor: isTarget ? (activeSkin?.colors.accent || '#6366f1') : 'transparent',
                              }}
                            >
                              {isTarget && <Check className="w-3 h-3 text-white stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold" style={{ color: activeSkin?.colors.textSecondary || '#94a3b8' }}>
                      New Deck Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. High-Yield Review"
                      value={newDeckTitle}
                      onChange={(e) => setNewDeckTitle(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                      style={{
                        backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : '#1e293b',
                        borderColor: activeSkin ? activeSkin.colors.border : '#334155',
                        color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc',
                      }}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold" style={{ color: activeSkin?.colors.textSecondary || '#94a3b8' }}>
                      Category (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Science, Medicine, Languages"
                      value={newDeckCategory}
                      onChange={(e) => setNewDeckCategory(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                      style={{
                        backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : '#1e293b',
                        borderColor: activeSkin ? activeSkin.colors.border : '#334155',
                        color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc',
                      }}
                    />
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: activeSkin?.colors.textMuted || '#94a3b8' }}>
                    A brand new deck will be created and the {selectedCardIds.size} selected cards will be automatically moved into it.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="p-4 border-t flex items-center justify-end gap-2 shrink-0"
              style={{ borderColor: activeSkin?.colors.border || '#1e293b' }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsMoveModalOpen(false);
                  setIsCreatingNewDeck(false);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl hover:opacity-80"
                style={{ color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkMove}
                disabled={!isCreatingNewDeck ? !targetDeckId : !newDeckTitle.trim()}
                className="px-5 py-2 disabled:opacity-40 text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
                style={{
                  backgroundColor: activeSkin?.colors.accent || '#4f46e5',
                  color: activeSkin?.colors.accentText || '#ffffff',
                  boxShadow: activeSkin ? `0 4px 14px ${activeSkin.colors.accentGlow}` : undefined,
                }}
              >
                <FolderInput className="w-3.5 h-3.5" />
                <span>Move {selectedCardIds.size} Cards</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Deck Confirmation Modal */}
      {isConfirmingDeleteDeck && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="border w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 transition-colors"
            style={{
              backgroundColor: activeSkin ? activeSkin.colors.surface : '#0f172a',
              borderColor: activeSkin ? activeSkin.colors.border : '#1e293b',
              color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold" style={{ color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc' }}>
                  Delete Deck
                </h2>
                <p className="text-xs" style={{ color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8' }}>
                  Confirm permanent deck removal
                </p>
              </div>
            </div>

            <div
              className="p-3.5 rounded-2xl border mb-5 text-xs space-y-1.5"
              style={{
                backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : '#1e293b',
                borderColor: activeSkin ? activeSkin.colors.border : '#334155',
              }}
            >
              <p className="font-semibold" style={{ color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc' }}>
                Are you sure you want to delete <span className="font-bold underline">{deck.title}</span>?
              </p>
              <p style={{ color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8' }}>
                This will permanently delete this deck and all{' '}
                <strong className="text-rose-400">{cards.length} cards</strong> contained inside it. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirmingDeleteDeck(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer"
                style={{
                  borderColor: activeSkin ? activeSkin.colors.border : '#334155',
                  color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingDeleteDeck(false);
                  if (onDeleteDeck) {
                    onDeleteDeck(deck.id);
                  }
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-lg shadow-rose-950/40 transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Deck</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
