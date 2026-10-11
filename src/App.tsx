import { useState, useEffect, useMemo } from 'react';
import { PlayCircle, Layers } from 'lucide-react';
import { AndroidStatusBar } from './components/AndroidStatusBar';
import { AndroidBottomNav, TabType } from './components/AndroidBottomNav';
import { DeckListView } from './components/DeckListView';
import { DeckDetailView } from './components/DeckDetailView';
import { ReviewSession } from './components/ReviewSession';
import { ReviewTabView } from './components/ReviewTabView';
import { CommunityDecksModal } from './components/CommunityDecksModal';
import { StatsView } from './components/StatsView';
import { CardEditorModal } from './components/CardEditorModal';
import { AiCardGeneratorModal } from './components/AiCardGeneratorModal';
import { PublishDeckModal } from './components/PublishDeckModal';
import { DeckSettingsModal } from './components/DeckSettingsModal';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { SkinSelectorModal } from './components/SkinSelectorModal';
import { SettingsView } from './components/SettingsView';

import { Deck, Flashcard, CommunityDeck } from './types';
import {
  loadStoredDecks,
  saveStoredDecks,
  loadStoredCards,
  saveStoredCards,
} from './utils/storage';
import { getAlgorithm } from './algorithms/spacedRepetition';
import {
  getActiveSkin, setActiveSkin, Skin,
  AppearanceSettings, loadAppearanceSettings, saveAppearanceSettings,
  getEffectiveSkin, applyAppearanceToDOM, APP_SKINS
} from './utils/skins';
import { getCurrentUser, UserProfile } from './utils/auth';

export default function App() {
  const [decks, setDecks] = useState<Deck[]>(loadStoredDecks);
  const [cards, setCards] = useState<Flashcard[]>(loadStoredCards);

  // Appearance & Studio state
  const [appearance, setAppearance] = useState<AppearanceSettings>(loadAppearanceSettings);
  const [activeSkin, setActiveSkinState] = useState<Skin>(getActiveSkin);

  // Sync DOM with saved appearance on initial mount
  useEffect(() => {
    applyAppearanceToDOM(appearance, activeSkin);
  }, []);

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getCurrentUser);

  // Auth & Profile & Skin modal states
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userProfileModalOpen, setUserProfileModalOpen] = useState(false);
  const [skinSelectorModalOpen, setSkinSelectorModalOpen] = useState(false);

  // Navigation tabs: 'decks' | 'review' | 'community' | 'ai-generator' | 'stats'
  const [currentTab, setCurrentTab] = useState<TabType>('decks');

  // Drill-down states
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [reviewingDeckId, setReviewingDeckId] = useState<string | null>(null);

  // Modals state
  const [cardEditorOpen, setCardEditorOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<Flashcard | null>(null);
  const [targetDeckForCard, setTargetDeckForCard] = useState<string>('');

  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  const [targetDeckForAi, setTargetDeckForAi] = useState<{ id: string; title: string } | null>(null);

  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [deckToPublish, setDeckToPublish] = useState<Deck | null>(null);

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [deckToConfigure, setDeckToConfigure] = useState<Deck | null>(null);

  // Toast / Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync to local storage on changes
  useEffect(() => {
    saveStoredDecks(decks);
  }, [decks]);

  useEffect(() => {
    saveStoredCards(cards);
  }, [cards]);

  // Derived selected deck and reviewing deck
  const selectedDeck = useMemo(() => {
    return decks.find(d => d.id === selectedDeckId) || null;
  }, [decks, selectedDeckId]);

  const reviewingDeck = useMemo(() => {
    return decks.find(d => d.id === reviewingDeckId) || null;
  }, [decks, reviewingDeckId]);

  const selectedDeckCards = useMemo(() => {
    if (!selectedDeckId) return [];
    return cards.filter(c => c.deckId === selectedDeckId);
  }, [cards, selectedDeckId]);

  const reviewingDeckCards = useMemo(() => {
    if (!reviewingDeckId) return [];
    return cards.filter(c => c.deckId === reviewingDeckId);
  }, [cards, reviewingDeckId]);

  // Overall due cards count for bottom nav badge
  const totalDueCount = useMemo(() => {
    return cards.filter(c => {
      const deck = decks.find(d => d.id === c.deckId);
      const algo = getAlgorithm(deck?.algorithm || 'leitner');
      return algo.isDue(c);
    }).length;
  }, [cards, decks]);

  // Card Management
  const handleSaveCard = (cardData: Partial<Flashcard>) => {
    if (cardToEdit) {
      // Update existing
      setCards(prev =>
        prev.map(c =>
          c.id === cardToEdit.id
            ? ({ ...c, ...cardData, updatedAt: new Date().toISOString() } as Flashcard)
            : c
        )
      );
      showToast('Flashcard updated');
    } else {
      // Create new
      const newCard: Flashcard = {
        id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        deckId: cardData.deckId || targetDeckForCard || (decks[0]?.id || 'default'),
        front: cardData.front || { text: '' },
        back: cardData.back || { text: '' },
        hint: cardData.hint,
        tags: cardData.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastReviewed: null,
        lapseCount: 0,
        leitnerBox: 1,
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        dueDate: new Date().toISOString(),
        reviewCount: 0,
      };
      setCards(prev => [newCard, ...prev]);

      // Update deck's cardCount
      setDecks(prev =>
        prev.map(d => (d.id === newCard.deckId ? { ...d, cardCount: (d.cardCount || 0) + 1 } : d))
      );
      showToast('Flashcard created');
    }
  };

  const handleSaveBatchCards = (newCardsData: Partial<Flashcard>[]) => {
    if (newCardsData.length === 0) return;
    const now = new Date().toISOString();
    const createdCards: Flashcard[] = newCardsData.map((cd, index) => ({
      id: `card-${Date.now()}-${index}`,
      deckId: cd.deckId || targetDeckForCard || selectedDeckId || decks[0]?.id || 'default',
      front: cd.front || { text: '' },
      back: cd.back || { text: '' },
      hint: cd.hint,
      tags: cd.tags || [],
      createdAt: now,
      updatedAt: now,
      lastReviewed: null,
      lapseCount: 0,
      leitnerBox: 1,
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      dueDate: now,
      reviewCount: 0,
    }));

    setCards(prev => [...createdCards, ...prev]);

    // Group counts by deckId
    const countsByDeck: Record<string, number> = {};
    createdCards.forEach(c => {
      countsByDeck[c.deckId] = (countsByDeck[c.deckId] || 0) + 1;
    });

    setDecks(prev =>
      prev.map(d => {
        const added = countsByDeck[d.id] || 0;
        return added > 0 ? { ...d, cardCount: (d.cardCount || 0) + added } : d;
      })
    );

    showToast(`Created ${createdCards.length} ${createdCards.length === 1 ? 'card' : 'cards'}`);
  };

  const handleDeleteCard = (cardId: string) => {
    const cardToDelete = cards.find(c => c.id === cardId);
    setCards(prev => prev.filter(c => c.id !== cardId));
    if (cardToDelete) {
      setDecks(prev =>
        prev.map(d =>
          d.id === cardToDelete.deckId ? { ...d, cardCount: Math.max(0, (d.cardCount || 1) - 1) } : d
        )
      );
    }
    showToast('Card deleted');
  };

  const handleBulkDeleteCards = (cardIds: string[], deckId: string) => {
    if (cardIds.length === 0) return;
    setCards(prev => prev.filter(c => !cardIds.includes(c.id)));
    setDecks(prev =>
      prev.map(d =>
        d.id === deckId ? { ...d, cardCount: Math.max(0, (d.cardCount || 0) - cardIds.length) } : d
      )
    );
    showToast(`Deleted ${cardIds.length} ${cardIds.length === 1 ? 'card' : 'cards'}`);
  };

  const handleBulkMoveCards = (cardIds: string[], sourceDeckId: string, targetDeckId: string) => {
    if (cardIds.length === 0) return;
    const targetDeck = decks.find(d => d.id === targetDeckId);
    setCards(prev =>
      prev.map(c =>
        cardIds.includes(c.id) ? { ...c, deckId: targetDeckId, updatedAt: new Date().toISOString() } : c
      )
    );
    setDecks(prev =>
      prev.map(d => {
        if (d.id === sourceDeckId) {
          return { ...d, cardCount: Math.max(0, (d.cardCount || 0) - cardIds.length) };
        }
        if (d.id === targetDeckId) {
          return { ...d, cardCount: (d.cardCount || 0) + cardIds.length };
        }
        return d;
      })
    );
    showToast(`Moved ${cardIds.length} ${cardIds.length === 1 ? 'card' : 'cards'} to "${targetDeck?.title || 'destination deck'}"`);
  };

  const handleCreateDeckAndMove = (cardIds: string[], sourceDeckId: string, newDeckTitle: string, newDeckCategory?: string) => {
    if (cardIds.length === 0) return;
    const newDeckId = `deck-${Date.now()}`;
    const now = new Date().toISOString();
    const newDeck: Deck = {
      id: newDeckId,
      title: newDeckTitle.trim() || 'New Deck',
      description: 'Created from moved flashcards',
      category: newDeckCategory?.trim() || 'General',
      tags: [],
      algorithm: 'leitner',
      color: 'from-blue-600 to-indigo-600',
      createdAt: now,
      updatedAt: now,
      cardCount: cardIds.length,
      version: '1.0.0',
      versionHistory: [
        {
          version: '1.0.0',
          date: now.split('T')[0],
          notes: 'Created from bulk transferred cards',
          cardsCount: cardIds.length,
        },
      ],
      sharingControl: {
        isPublic: false,
        allowRemix: true,
        authorName: 'You',
        license: 'CC-BY-SA 4.0',
      },
    };

    setDecks(prev => [
      newDeck,
      ...prev.map(d =>
        d.id === sourceDeckId ? { ...d, cardCount: Math.max(0, (d.cardCount || 0) - cardIds.length) } : d
      ),
    ]);
    setCards(prev =>
      prev.map(c =>
        cardIds.includes(c.id) ? { ...c, deckId: newDeckId, updatedAt: now } : c
      )
    );
    showToast(`Created "${newDeck.title}" and moved ${cardIds.length} ${cardIds.length === 1 ? 'card' : 'cards'}`);
  };

  const handleUpdateCardProgress = (updatedCard: Flashcard) => {
    setCards(prev => prev.map(c => (c.id === updatedCard.id ? updatedCard : c)));
  };

  // Deck Management
  const handleCreateDeck = (deckData: Partial<Deck>) => {
    const newDeck: Deck = {
      id: `deck-${Date.now()}`,
      title: deckData.title || 'Untitled Deck',
      description: deckData.description || '',
      category: deckData.category || 'General',
      tags: deckData.tags || [],
      algorithm: deckData.algorithm || 'leitner',
      color: deckData.color || 'from-indigo-600 to-cyan-600',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cardCount: 0,
      version: '1.0.0',
      versionHistory: [
        {
          version: '1.0.0',
          date: new Date().toISOString().split('T')[0],
          notes: 'Initial creation',
          cardsCount: 0,
        },
      ],
      sharingControl: {
        isPublic: false,
        allowRemix: true,
        authorName: 'You',
        license: 'CC-BY-SA 4.0',
      },
    };
    setDecks(prev => [newDeck, ...prev]);
    showToast(`Deck "${newDeck.title}" created`);
  };

  const handleUpdateDeck = (updatedDeck: Deck) => {
    setDecks(prev => prev.map(d => (d.id === updatedDeck.id ? updatedDeck : d)));
    showToast(`Deck updated`);
  };

  const handleDeleteDeck = (deckId: string) => {
    setDecks(prev => prev.filter(d => d.id !== deckId));
    setCards(prev => prev.filter(c => c.deckId !== deckId));
    if (selectedDeckId === deckId) setSelectedDeckId(null);
    if (reviewingDeckId === deckId) setReviewingDeckId(null);
    showToast('Deck deleted');
  };

  // Review sessions
  const handleStartReviewDeck = (deck: Deck) => {
    setReviewingDeckId(deck.id);
  };

  // AI Cards Approved from PDF/Notes
  const handleAiCardsApproved = (approvedCards: Partial<Flashcard>[]) => {
    const targetId = targetDeckForAi?.id || decks[0]?.id || 'default';
    const now = new Date().toISOString();
    const newFlashcards: Flashcard[] = approvedCards.map((c, idx) => ({
      id: `ai-card-${Date.now()}-${idx}`,
      deckId: targetId,
      front: c.front || { text: '' },
      back: c.back || { text: '' },
      hint: c.hint,
      tags: c.tags || ['AI-Generated'],
      createdAt: now,
      updatedAt: now,
      lastReviewed: null,
      lapseCount: 0,
      leitnerBox: 1,
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      dueDate: now,
      reviewCount: 0,
    }));

    setCards(prev => [...newFlashcards, ...prev]);
    setDecks(prev =>
      prev.map(d =>
        d.id === targetId ? { ...d, cardCount: (d.cardCount || 0) + newFlashcards.length } : d
      )
    );
    showToast(`Imported ${newFlashcards.length} AI-generated cards`);
  };

  // Import Community Deck
  const handleImportCommunityDeck = (commDeck: CommunityDeck) => {
    const newDeckId = `deck-imported-${Date.now()}`;
    const now = new Date().toISOString();
    const newDeck: Deck = {
      id: newDeckId,
      title: commDeck.title,
      description: commDeck.description,
      category: commDeck.category,
      tags: commDeck.tags || [],
      algorithm: 'leitner',
      color: 'from-purple-600 to-indigo-600',
      createdAt: now,
      updatedAt: now,
      version: commDeck.version,
      versionHistory: commDeck.versions?.map(v => ({
        version: v.version,
        date: v.date,
        notes: v.notes,
        cardsCount: commDeck.cardCount,
      })) || [],
      cardCount: commDeck.cardCount,
      communityId: commDeck.id,
      isCommunityShared: true,
      sharingControl: {
        isPublic: true,
        allowRemix: commDeck.sharingControl?.allowRemix ?? true,
        authorName: commDeck.author,
        license: commDeck.sharingControl?.license || 'CC-BY-SA 4.0',
      },
    };

    // Prepare cards
    const sourceCards = commDeck.cards && commDeck.cards.length > 0 ? commDeck.cards : commDeck.sampleCards || [];
    const newCards: Flashcard[] = sourceCards.map((sc: any, idx: number) => ({
      id: `card-comm-${Date.now()}-${idx}`,
      deckId: newDeckId,
      front: sc.front || { text: sc.frontText || '' },
      back: sc.back || { text: sc.backText || '', explanation: sc.backExplanation },
      hint: sc.hint,
      tags: sc.tags || commDeck.tags || [],
      createdAt: now,
      updatedAt: now,
      lastReviewed: null,
      lapseCount: 0,
      leitnerBox: 1,
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      dueDate: now,
      reviewCount: 0,
    }));

    setDecks(prev => [newDeck, ...prev]);
    setCards(prev => [...newCards, ...prev]);
    showToast(`Added "${commDeck.title}" with ${newCards.length} cards to your library`);
  };

  const handleSelectSkin = (skinId: string, customAccent?: string | null) => {
    const s = setActiveSkin(skinId, customAccent);
    setActiveSkinState(s);
    const updatedAppearance: AppearanceSettings = {
      ...appearance,
      skinId,
      customAccentColor: customAccent !== undefined ? customAccent : appearance.customAccentColor,
    };
    setAppearance(updatedAppearance);
    saveAppearanceSettings(updatedAppearance);
    applyAppearanceToDOM(updatedAppearance, s);
    showToast(`Applied "${s.name}" skin`);
  };

  const handleUpdateAppearance = (newSettings: AppearanceSettings) => {
    setAppearance(newSettings);
    saveAppearanceSettings(newSettings);
    const baseSkin = APP_SKINS.find(s => s.id === newSettings.skinId) || APP_SKINS[0];
    const effective = getEffectiveSkin(baseSkin, newSettings.customAccentColor);
    setActiveSkinState(effective);
    applyAppearanceToDOM(newSettings, effective);
  };

  const handleCycleSkin = () => {
    const currentIndex = APP_SKINS.findIndex(s => s.id === appearance.skinId);
    const nextIndex = (currentIndex + 1) % APP_SKINS.length;
    const nextSkin = APP_SKINS[nextIndex];
    handleSelectSkin(nextSkin.id, appearance.customAccentColor);
  };

  const handleAuthSuccess = (profile: UserProfile) => {
    setCurrentUser(profile);
    setAuthModalOpen(false);
    showToast(`Welcome, ${profile.name}! Cloud sync connected.`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    showToast('Signed out of cloud account');
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors duration-300"
      style={{
        backgroundColor: activeSkin.colors.bg,
        color: activeSkin.colors.textPrimary,
      }}
    >
      
      {/* Top Android Status Bar */}
      <AndroidStatusBar activeSkin={activeSkin} />

      {/* Main Screen Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto overflow-x-hidden">
        
        {/* ACTIVE REVIEW MODE (Full Screen Focus) */}
        {reviewingDeck ? (
          <ReviewSession
            key={reviewingDeck.id}
            deck={reviewingDeck}
            cards={reviewingDeckCards}
            activeSkin={activeSkin}
            onFinish={() => setReviewingDeckId(null)}
            onUpdateCard={handleUpdateCardProgress}
          />
        ) : selectedDeck ? (
          /* DECK DETAIL VIEW */
          <DeckDetailView
            deck={selectedDeck}
            cards={selectedDeckCards}
            availableDecks={decks}
            activeSkin={activeSkin}
            onBack={() => setSelectedDeckId(null)}
            onStartReview={() => handleStartReviewDeck(selectedDeck)}
            onOpenCardEditor={(card) => {
              setCardToEdit(card || null);
              setTargetDeckForCard(selectedDeck.id);
              setCardEditorOpen(true);
            }}
            onDeleteCard={handleDeleteCard}
            onBulkDeleteCards={(cardIds) => handleBulkDeleteCards(cardIds, selectedDeck.id)}
            onBulkMoveCards={(cardIds, targetDeckId) => handleBulkMoveCards(cardIds, selectedDeck.id, targetDeckId)}
            onCreateDeckAndMove={(cardIds, title, category) => handleCreateDeckAndMove(cardIds, selectedDeck.id, title, category)}
            onAddCards={handleAiCardsApproved}
            onOpenAiGenerator={() => {
              setTargetDeckForAi({ id: selectedDeck.id, title: selectedDeck.title });
              setAiGeneratorOpen(true);
            }}
            onOpenPublish={() => {
              setDeckToPublish(selectedDeck);
              setPublishModalOpen(true);
            }}
            onOpenSettings={() => {
              setDeckToConfigure(selectedDeck);
              setSettingsModalOpen(true);
            }}
          />
        ) : (
          /* TAB NAVIGATION VIEWS */
          <>
            {currentTab === 'decks' && (
              <DeckListView
                decks={decks}
                cards={cards}
                activeSkin={activeSkin}
                user={currentUser}
                onOpenAuth={() => setAuthModalOpen(true)}
                onOpenProfile={() => setUserProfileModalOpen(true)}
                onOpenSkinSelector={() => setSkinSelectorModalOpen(true)}
                onCycleSkin={handleCycleSkin}
                onOpenSettings={() => setCurrentTab('settings')}
                onSelectDeck={(deck) => setSelectedDeckId(deck.id)}
                onStartReviewDeck={handleStartReviewDeck}
                onCreateDeck={handleCreateDeck}
                onOpenAiGenerator={(deck) => {
                  setTargetDeckForAi({ id: deck.id, title: deck.title });
                  setAiGeneratorOpen(true);
                }}
              />
            )}

            {currentTab === 'review' && (
              <ReviewTabView
                decks={decks}
                cards={cards}
                activeSkin={activeSkin}
                onStartReviewDeck={handleStartReviewDeck}
              />
            )}

            {currentTab === 'community' && (
              <CommunityDecksModal
                onImportDeck={handleImportCommunityDeck}
                userDeckTitles={decks.map(d => d.title)}
                activeSkin={activeSkin}
              />
            )}

            {currentTab === 'ai-generator' && (
              <div className="max-w-xl mx-auto px-4 py-8 text-center space-y-4">
                <h2 className="text-xl font-bold" style={{ color: activeSkin.colors.textPrimary }}>AI Flashcard Generator</h2>
                <p className="text-xs" style={{ color: activeSkin.colors.textSecondary }}>
                  Select a destination deck to generate multimedia flashcards from PDFs, notes, or medical topics
                </p>
                <div className="space-y-2.5 text-left">
                  {decks.map(deck => (
                    <div
                      key={deck.id}
                      onClick={() => {
                        setTargetDeckForAi({ id: deck.id, title: deck.title });
                        setAiGeneratorOpen(true);
                      }}
                      className="p-4 border rounded-2xl cursor-pointer flex items-center justify-between transition-all hover:shadow-lg"
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
                      <div>
                        <span className="text-sm font-bold block" style={{ color: activeSkin.colors.textPrimary }}>
                          {deck.title}
                        </span>
                        <span className="text-xs" style={{ color: activeSkin.colors.textSecondary }}>
                          {deck.category}
                        </span>
                      </div>
                      <span
                        className="px-3 py-1.5 border rounded-xl text-xs font-bold transition-all shadow-sm"
                        style={{
                          backgroundColor: `${activeSkin.colors.accent}1a`,
                          borderColor: `${activeSkin.colors.accent}33`,
                          color: activeSkin.colors.accent,
                        }}
                      >
                        Generate Cards
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentTab === 'stats' && (
              <StatsView decks={decks} cards={cards} activeSkin={activeSkin} />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                activeSkin={activeSkin}
                user={currentUser}
                decks={decks}
                cards={cards}
                onSelectSkin={(skinId) => handleSelectSkin(skinId)}
                onOpenSkinSelector={() => setSkinSelectorModalOpen(true)}
                onCycleSkin={handleCycleSkin}
                onOpenProfile={() => setUserProfileModalOpen(true)}
                onOpenAuth={() => setAuthModalOpen(true)}
                onLogout={handleLogout}
                onBack={() => setCurrentTab('decks')}
              />
            )}
          </>
        )}
      </main>

      {/* Android Bottom Navigation Bar (Hidden during active review) */}
      {!reviewingDeck && (
        <AndroidBottomNav
          currentTab={currentTab}
          onTabChange={(tab) => {
            setSelectedDeckId(null);
            setCurrentTab(tab);
          }}
          dueCardsCount={totalDueCount}
          activeSkin={activeSkin}
        />
      )}

      {/* User Authentication Modal (Sign In / Sign Up) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        activeSkin={activeSkin}
      />

      {/* User Profile & Sync Modal */}
      {currentUser && (
        <UserProfileModal
          isOpen={userProfileModalOpen}
          onClose={() => setUserProfileModalOpen(false)}
          user={currentUser}
          activeSkin={activeSkin}
          deckCount={decks.length}
          cardCount={cards.length}
          onLogout={handleLogout}
          onOpenSkinSelector={() => {
            setUserProfileModalOpen(false);
            setSkinSelectorModalOpen(true);
          }}
          onOpenAuth={() => {
            setUserProfileModalOpen(false);
            setAuthModalOpen(true);
          }}
        />
      )}

      {/* Skin & Appearance Studio Modal (14 themes + fonts + curves + glassmorphism) */}
      <SkinSelectorModal
        isOpen={skinSelectorModalOpen}
        onClose={() => setSkinSelectorModalOpen(false)}
        activeSkin={activeSkin}
        onSelectSkin={handleSelectSkin}
        appearanceSettings={appearance}
        onUpdateAppearance={handleUpdateAppearance}
      />

      {/* Card Editor Modal */}
      {cardEditorOpen && (
        <CardEditorModal
          isOpen={cardEditorOpen}
          onClose={() => {
            setCardEditorOpen(false);
            setCardToEdit(null);
          }}
          onSave={handleSaveCard}
          onSaveBatch={handleSaveBatchCards}
          initialCard={cardToEdit}
          deckId={targetDeckForCard || selectedDeckId || decks[0]?.id || 'default'}
          activeSkin={activeSkin}
        />
      )}

      {/* AI Card Generator Modal with Preview & Approval */}
      {targetDeckForAi && (
        <AiCardGeneratorModal
          isOpen={aiGeneratorOpen}
          onClose={() => {
            setAiGeneratorOpen(false);
            setTargetDeckForAi(null);
          }}
          targetDeckId={targetDeckForAi.id}
          targetDeckTitle={targetDeckForAi.title}
          onCardsApproved={handleAiCardsApproved}
          activeSkin={activeSkin}
        />
      )}

      {/* Publish Deck to Cloud Community Modal */}
      {deckToPublish && (
        <PublishDeckModal
          isOpen={publishModalOpen}
          onClose={() => {
            setPublishModalOpen(false);
            setDeckToPublish(null);
          }}
          deck={deckToPublish}
          cards={cards.filter(c => c.deckId === deckToPublish.id)}
          onPublished={handleUpdateDeck}
          activeSkin={activeSkin}
        />
      )}

      {/* Deck Settings & Algorithm Switch Modal */}
      {deckToConfigure && (
        <DeckSettingsModal
          isOpen={settingsModalOpen}
          onClose={() => {
            setSettingsModalOpen(false);
            setDeckToConfigure(null);
          }}
          deck={deckToConfigure}
          cards={cards.filter(c => c.deckId === deckToConfigure.id)}
          onSaveDeck={handleUpdateDeck}
          onDeleteDeck={handleDeleteDeck}
          activeSkin={activeSkin}
          onOpenSkinSelector={() => {
            setSettingsModalOpen(false);
            setSkinSelectorModalOpen(true);
          }}
          onSelectSkin={(skinId) => handleSelectSkin(skinId)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed bottom-18 left-1/2 -translate-x-1/2 z-50 text-xs font-semibold px-4 py-2.5 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-bottom duration-200 transition-all"
          style={{
            backgroundColor: activeSkin.colors.surface,
            borderColor: activeSkin.colors.border,
            color: activeSkin.colors.textPrimary,
            boxShadow: `0 8px 25px -4px ${activeSkin.colors.accentGlow}`,
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
