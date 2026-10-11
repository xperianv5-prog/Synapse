import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  X, RotateCw, Volume2, HelpCircle, CheckCircle2,
  ArrowLeft, Mic, Sparkles, Trophy, Award, Undo2, BookOpen,
  ZoomIn, Maximize2
} from 'lucide-react';
import { Flashcard, Deck, ReviewRating } from '../types';
import { getAlgorithm } from '../algorithms/spacedRepetition';
import { AudioPlayerWave } from './AudioPlayerWave';
import { speakText } from '../utils/audio';
import { Skin } from '../utils/skins';
import { getCardFrontText, getCardBackText, getCardExplanation } from '../utils/cardHelpers';

interface ReviewSessionProps {
  deck: Deck;
  cards: Flashcard[];
  activeSkin?: Skin;
  onFinish: () => void;
  onUpdateCard: (updatedCard: Flashcard) => void;
}

// Helper to render markdown bold markers (**text**) cleanly
function renderRichText(text: string, activeSkin?: Skin, isHighlight = false) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong
          key={idx}
          className="font-black underline decoration-2 underline-offset-4"
          style={{
            color: activeSkin ? activeSkin.colors.accent : '#818cf8',
          }}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

// Adaptive font sizing based on text length
function getQuestionTextClass(text: string): string {
  const len = text.trim().length;
  if (len <= 70) return 'text-2xl sm:text-3xl font-extrabold leading-snug tracking-tight';
  if (len <= 160) return 'text-xl sm:text-2xl font-bold leading-relaxed';
  return 'text-base sm:text-lg font-medium leading-relaxed text-left sm:text-center';
}

function getAnswerTextClass(text: string): string {
  const len = text.trim().length;
  if (len <= 70) return 'text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-snug';
  if (len <= 160) return 'text-xl sm:text-2xl font-extrabold leading-snug';
  return 'text-base sm:text-lg font-semibold leading-relaxed text-left sm:text-center';
}

export function ReviewSession({
  deck,
  cards,
  activeSkin,
  onFinish,
  onUpdateCard,
}: ReviewSessionProps) {
  const algorithm = useMemo(() => getAlgorithm(deck.algorithm), [deck.algorithm]);

  // Build the dynamic review queue
  const initialQueue = useMemo(() => {
    const due = cards.filter(c => algorithm.isDue(c));
    // If no cards are strictly due, provide all cards for practice
    const queueToUse = due.length > 0 ? due : cards;
    return [...queueToUse].sort(() => Math.random() - 0.5);
  }, [cards, algorithm]);

  const [queue, setQueue] = useState<Flashcard[]>(initialQueue);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [historyStack, setHistoryStack] = useState<{ card: Flashcard; previousState: Flashcard }[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, totalReviewed: 0 });

  // Lightbox zoom modal state
  const [zoomedImage, setZoomedImage] = useState<{ url: string; caption?: string } | null>(null);

  // Voice Answer Check (Speech to text)
  const [spokenAnswer, setSpokenAnswer] = useState<string | null>(null);
  const [detectedLangName, setDetectedLangName] = useState<string | null>(null);
  const [ttsActive, setTtsActive] = useState(false);

  const currentCard = queue[currentIndex] || null;

  useEffect(() => {
    setIsFlipped(false);
    setShowHint(false);
    setSpokenAnswer(null);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [currentIndex]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCompleted || zoomedImage) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(f => !f);
      } else if (e.key === 'z' || (e.key === 'Z' && (e.ctrlKey || e.metaKey))) {
        handleUndo();
      } else if (isFlipped) {
        if (e.key === '1') handleRate('again');
        else if (e.key === '2') handleRate('hard');
        else if (e.key === '3') handleRate('good');
        else if (e.key === '4') handleRate('easy');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, isCompleted, currentCard, zoomedImage]);

  const handleRate = (rating: ReviewRating) => {
    if (!currentCard) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const previousState = { ...currentCard };
    const result = algorithm.calculateNextReview(currentCard, rating);

    const updatedCard: Flashcard = {
      ...currentCard,
      leitnerBox: result.nextBox,
      interval: result.nextIntervalDays,
      easeFactor: result.newEaseFactor,
      repetitions: result.newRepetitions,
      dueDate: result.nextDueDate.toISOString(),
      lastReviewed: new Date().toISOString(),
      reviewCount: (currentCard.reviewCount || 0) + 1,
      lapseCount: (currentCard.lapseCount || 0) + (rating === 'again' ? 1 : 0),
    };

    onUpdateCard(updatedCard);
    setHistoryStack(prev => [...prev, { card: updatedCard, previousState }]);

    const isCorrect = rating === 'good' || rating === 'easy';
    setSessionStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
      totalReviewed: prev.totalReviewed + 1,
    }));

    // If rated "again" in cram mode or Leitner, re-queue at end of current queue
    if (rating === 'again') {
      setQueue(prev => [...prev, currentCard]);
    }

    if (currentIndex + 1 >= queue.length) {
      // Session finished!
      setIsCompleted(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleUndo = () => {
    if (historyStack.length === 0 || currentIndex === 0) return;
    const last = historyStack[historyStack.length - 1];
    onUpdateCard(last.previousState);
    setHistoryStack(prev => prev.slice(0, -1));
    setCurrentIndex(prev => Math.max(0, prev - 1));
    setIsFlipped(false);
  };

  const handleTts = async (text: string) => {
    setTtsActive(true);
    try {
      await speakText(text);
    } finally {
      setTtsActive(false);
    }
  };

  const predictedIntervals = useMemo(() => {
    if (!currentCard) return { again: '', hard: '', good: '', easy: '' };
    return algorithm.getPredictedIntervals(currentCard);
  }, [currentCard, algorithm]);

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 py-8 text-center animate-in fade-in duration-300">
        <div
          className="w-16 h-16 rounded-3xl border flex items-center justify-center mb-4 shadow-xl"
          style={{
            backgroundColor: activeSkin?.colors.surfaceHover || '#1e293b',
            borderColor: activeSkin?.colors.border || '#334155',
            color: activeSkin?.colors.textSecondary || '#94a3b8',
          }}
        >
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: activeSkin?.colors.textPrimary || '#f1f5f9' }}>
          No Cards in this Deck
        </h2>
        <p className="text-xs max-w-sm mb-6" style={{ color: activeSkin?.colors.textSecondary || '#94a3b8' }}>
          This deck does not have any flashcards yet. Add your first card or use the AI generator to extract cards from notes or documents.
        </p>
        <button
          onClick={onFinish}
          className="py-2.5 px-6 text-xs font-bold rounded-2xl shadow-lg transition-all"
          style={{
            backgroundColor: activeSkin?.colors.accent || '#4f46e5',
            color: activeSkin?.colors.accentText || '#ffffff',
            boxShadow: activeSkin ? `0 4px 14px ${activeSkin.colors.accentGlow}` : undefined,
          }}
        >
          Return to Deck
        </button>
      </div>
    );
  }

  if (isCompleted || !currentCard) {
    const accuracy = sessionStats.totalReviewed > 0
      ? Math.round((sessionStats.correct / sessionStats.totalReviewed) * 100)
      : 100;

    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 py-8 text-center animate-in fade-in duration-300">
        <div
          className="w-20 h-20 rounded-3xl border flex items-center justify-center mb-6 shadow-2xl"
          style={{
            backgroundColor: activeSkin ? `${activeSkin.colors.accent}20` : '#4f46e520',
            borderColor: activeSkin ? `${activeSkin.colors.accent}50` : '#4f46e560',
            color: activeSkin?.colors.accent || '#818cf8',
            boxShadow: activeSkin ? `0 8px 30px ${activeSkin.colors.accentGlow}` : undefined,
          }}
        >
          <Trophy className="w-10 h-10 animate-bounce" />
        </div>

        <h2 className="text-2xl font-extrabold tracking-tight mb-2" style={{ color: activeSkin?.colors.textPrimary || '#f1f5f9' }}>
          Session Complete!
        </h2>
        <p className="text-sm max-w-sm mb-8" style={{ color: activeSkin?.colors.textSecondary || '#94a3b8' }}>
          You reviewed all scheduled cards for <span className="font-semibold" style={{ color: activeSkin?.colors.accent || '#a5b4fc' }}>{deck.title}</span> using the {algorithm.name} algorithm.
        </p>

        {/* Performance metrics */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-8">
          <div
            className="border rounded-2xl p-4 text-center"
            style={{
              backgroundColor: activeSkin?.colors.surface || '#0f172a',
              borderColor: activeSkin?.colors.border || '#1e293b',
            }}
          >
            <span className="text-2xl font-black" style={{ color: activeSkin?.colors.textPrimary || '#f8fafc' }}>
              {sessionStats.totalReviewed}
            </span>
            <span className="block text-[11px] font-medium mt-0.5" style={{ color: activeSkin?.colors.textSecondary || '#94a3b8' }}>
              Cards Reviewed
            </span>
          </div>
          <div
            className="border rounded-2xl p-4 text-center"
            style={{
              backgroundColor: activeSkin?.colors.surface || '#0f172a',
              borderColor: activeSkin?.colors.border || '#1e293b',
            }}
          >
            <span className="text-2xl font-black text-emerald-400">{accuracy}%</span>
            <span className="block text-[11px] font-medium mt-0.5" style={{ color: activeSkin?.colors.textSecondary || '#94a3b8' }}>
              Retention Rate
            </span>
          </div>
          <div
            className="border rounded-2xl p-4 text-center"
            style={{
              backgroundColor: activeSkin?.colors.surface || '#0f172a',
              borderColor: activeSkin?.colors.border || '#1e293b',
            }}
          >
            <span className="text-2xl font-black" style={{ color: activeSkin?.colors.accent || '#818cf8' }}>
              +{sessionStats.correct * 5}
            </span>
            <span className="block text-[11px] font-medium mt-0.5" style={{ color: activeSkin?.colors.textSecondary || '#94a3b8' }}>
              XP Earned
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full max-w-xs">
          <button
            onClick={() => {
              setQueue([...cards].sort(() => Math.random() - 0.5));
              setCurrentIndex(0);
              setIsCompleted(false);
              setSessionStats({ correct: 0, incorrect: 0, totalReviewed: 0 });
            }}
            className="flex-1 py-3 px-4 text-xs font-bold rounded-2xl border transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: activeSkin?.colors.surfaceHover || '#1e293b',
              borderColor: activeSkin?.colors.border || '#334155',
              color: activeSkin?.colors.textPrimary || '#e2e8f0',
            }}
          >
            <RotateCw className="w-4 h-4" />
            Study Again
          </button>
          <button
            onClick={onFinish}
            className="flex-1 py-3 px-4 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg"
            style={{
              backgroundColor: activeSkin?.colors.accent || '#4f46e5',
              color: activeSkin?.colors.accentText || '#ffffff',
              boxShadow: activeSkin ? `0 6px 18px ${activeSkin.colors.accentGlow}` : undefined,
            }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Done
          </button>
        </div>
      </div>
    );
  }

  const progressPct = ((currentIndex) / queue.length) * 100;

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] max-w-2xl sm:max-w-3xl mx-auto px-3 sm:px-6 py-3 select-none">
      
      {/* Top Review Bar */}
      <div
        className="flex items-center justify-between py-2 border-b mb-3"
        style={{ borderColor: activeSkin ? activeSkin.colors.border : '#33415580' }}
      >
        <button
          onClick={onFinish}
          className="p-2 rounded-xl hover:opacity-80 transition-colors"
          style={{ color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8' }}
          title="Exit review"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress indicator */}
        <div className="flex-1 mx-4">
          <div className="flex items-center justify-between text-xs font-medium mb-1.5" style={{ color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8' }}>
            <span className="truncate max-w-[200px] font-bold" style={{ color: activeSkin ? activeSkin.colors.textPrimary : '#f1f5f9' }}>
              {deck.title}
            </span>
            <span className="font-mono font-bold text-xs">{currentIndex + 1} / {queue.length}</span>
          </div>
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : '#1e293b' }}
          >
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{
                width: `${progressPct}%`,
                backgroundColor: activeSkin ? activeSkin.colors.accent : '#6366f1',
                boxShadow: activeSkin ? `0 0 10px ${activeSkin.colors.accentGlow}` : undefined,
              }}
            />
          </div>
        </div>

        {/* Undo button */}
        <button
          onClick={handleUndo}
          disabled={historyStack.length === 0}
          className="disabled:opacity-30 p-2 rounded-xl hover:opacity-80 transition-colors"
          style={{ color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8' }}
          title="Undo last rating"
        >
          <Undo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Sub-bar: Algorithm badge */}
      <div className="flex items-center justify-between text-xs px-1 mb-3">
        <div className="flex items-center gap-1.5">
          <span
            className="px-2.5 py-0.5 rounded-full font-medium text-[11px] border"
            style={{
              backgroundColor: activeSkin ? activeSkin.colors.surface : '#1e293b',
              borderColor: activeSkin ? activeSkin.colors.border : '#33415580',
              color: activeSkin ? activeSkin.colors.accent : '#a5b4fc',
            }}
          >
            {algorithm.name}
          </span>
          {deck.algorithm === 'leitner' && (
            <span className="text-[11px] font-mono opacity-75" style={{ color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8' }}>
              Box {currentCard.leitnerBox || 1}
            </span>
          )}
        </div>
      </div>

      {/* Spoken voice feedback banner if active */}
      {spokenAnswer && (
        <div className="mb-3 p-3 bg-indigo-950/50 border border-indigo-800/60 rounded-2xl text-xs text-indigo-200 flex items-start justify-between gap-2 animate-in fade-in">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-indigo-400">Your spoken recall:</span>
              {detectedLangName && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded-full border border-indigo-500/30">
                  {detectedLangName}
                </span>
              )}
            </div>
            <p className="italic">"{spokenAnswer}"</p>
          </div>
          <button
            onClick={() => {
              setSpokenAnswer(null);
              setDetectedLangName(null);
            }}
            className="text-indigo-400 hover:text-indigo-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3D Flashcard Container - Generous, Adaptive, Ergonomic Size */}
      <div
        className="relative flex-1 w-full min-h-[480px] sm:min-h-[520px] md:min-h-[560px] perspective-1000 cursor-pointer"
        onClick={() => setIsFlipped(f => !f)}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className="w-full h-full transform-style-3d relative rounded-3xl"
        >
          {/* FRONT OF CARD */}
          <div
            className="absolute inset-0 backface-hidden border rounded-3xl p-5 sm:p-7 flex flex-col justify-between shadow-2xl transition-all overflow-hidden"
            style={{
              backgroundColor: activeSkin ? activeSkin.colors.surface : '#0f172a',
              borderColor: activeSkin ? activeSkin.colors.border : '#1e293b',
              color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc',
              boxShadow: activeSkin ? `0 12px 36px -8px ${activeSkin.colors.accentGlow}` : undefined,
            }}
          >
            {/* Front Header */}
            <div
              className="flex items-center justify-between text-xs border-b pb-3 shrink-0"
              style={{ borderColor: activeSkin ? activeSkin.colors.border : '#1e293b' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase text-[10px] border shadow-xs"
                  style={{
                    backgroundColor: `${activeSkin?.colors.accent || '#818cf8'}1f`,
                    borderColor: `${activeSkin?.colors.accent || '#818cf8'}35`,
                    color: activeSkin ? activeSkin.colors.accent : '#818cf8',
                  }}
                >
                  Question
                </span>
                {currentCard.tags.length > 0 && (
                  <span
                    className="text-[10px] font-mono hidden sm:inline px-2 py-0.5 rounded-md truncate max-w-[150px]"
                    style={{
                      backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : '#1e293b',
                      color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8',
                    }}
                  >
                    #{currentCard.tags[0]}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                {currentCard.front?.media?.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setZoomedImage({
                      url: currentCard.front!.media!.imageUrl!,
                      caption: currentCard.front!.media!.imageCaption || 'Question image'
                    })}
                    className="p-1.5 rounded-xl transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : undefined,
                      color: activeSkin ? activeSkin.colors.textSecondary : undefined,
                    }}
                    title="Zoom image full screen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleTts(getCardFrontText(currentCard))}
                  disabled={ttsActive}
                  className="p-1.5 rounded-xl transition-colors hover:opacity-80 flex items-center gap-1"
                  style={{
                    backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : undefined,
                    color: activeSkin ? activeSkin.colors.textSecondary : undefined,
                  }}
                  title="Speak question aloud"
                >
                  <Volume2 className={`w-4 h-4 ${ttsActive ? 'animate-pulse text-indigo-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Front Content & Media - Sized ergonomically with custom scrollbar */}
            <div className="flex-1 w-full overflow-y-auto my-auto py-3 px-1 sm:px-4 flex flex-col justify-center items-center text-center custom-scrollbar">
              {currentCard.front?.media?.imageUrl && (
                <div
                  className="my-2.5 max-h-44 sm:max-h-56 md:max-h-60 overflow-hidden rounded-2xl mx-auto shadow-md border group/img relative"
                  style={{ borderColor: activeSkin ? activeSkin.colors.border : '#334155' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedImage({
                      url: currentCard.front!.media!.imageUrl!,
                      caption: currentCard.front!.media!.imageCaption || 'Question image'
                    });
                  }}
                >
                  <img
                    src={currentCard.front.media.imageUrl}
                    alt={currentCard.front.media.imageCaption || 'Card visual'}
                    className="max-h-44 sm:max-h-56 md:max-h-60 w-auto object-contain rounded-2xl transition-transform group-hover/img:scale-102"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-black/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 shadow">
                      <ZoomIn className="w-3.5 h-3.5" /> Tap to zoom
                    </span>
                  </div>
                </div>
              )}

              <div
                className={`w-full whitespace-pre-line ${getQuestionTextClass(getCardFrontText(currentCard))}`}
                style={{ color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc' }}
              >
                {renderRichText(getCardFrontText(currentCard), activeSkin)}
              </div>

              {currentCard.front?.media?.audioData && (
                <div className="mt-4 max-w-sm mx-auto w-full" onClick={e => e.stopPropagation()}>
                  <AudioPlayerWave
                    audioData={currentCard.front.media.audioData}
                    duration={currentCard.front.media.audioDuration}
                    title="Audio prompt"
                  />
                </div>
              )}
            </div>

            {/* Front Footer: Hint & Flip prompt */}
            <div
              className="pt-3 border-t flex items-center justify-between text-xs shrink-0"
              style={{
                borderColor: activeSkin ? activeSkin.colors.border : '#1e293b',
                color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8',
              }}
            >
              {currentCard.hint ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHint(h => !h);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-amber-400 hover:text-amber-300 transition-all font-medium border border-amber-500/20 bg-amber-500/10 active:scale-95"
                >
                  <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[160px] sm:max-w-xs">{showHint ? currentCard.hint : 'Hint'}</span>
                </button>
              ) : (
                <div />
              )}

              <span className="text-[11px] flex items-center gap-1.5 font-mono opacity-75">
                <RotateCw className="w-3 h-3 animate-spin-slow" />
                Tap card or Space to flip
              </span>
            </div>
          </div>

          {/* BACK OF CARD */}
          <div
            className="absolute inset-0 backface-hidden rotate-y-180 border rounded-3xl p-5 sm:p-7 flex flex-col justify-between shadow-2xl transition-all overflow-hidden"
            style={{
              backgroundColor: activeSkin ? activeSkin.colors.surface : '#0f172a',
              borderColor: activeSkin ? activeSkin.colors.accent : '#6366f1',
              color: activeSkin ? activeSkin.colors.textPrimary : '#f8fafc',
              boxShadow: activeSkin ? `0 0 35px ${activeSkin.colors.accentGlow}` : undefined,
            }}
          >
            {/* Back Header */}
            <div
              className="flex items-center justify-between text-xs border-b pb-3 shrink-0"
              style={{ borderColor: activeSkin ? activeSkin.colors.border : '#1e293b' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-0.5 rounded-full font-black tracking-wider uppercase text-[10px] border shadow-xs"
                  style={{
                    backgroundColor: `${activeSkin?.colors.accent || '#34d399'}1f`,
                    borderColor: `${activeSkin?.colors.accent || '#34d399'}35`,
                    color: activeSkin ? activeSkin.colors.accent : '#34d399',
                  }}
                >
                  Answer
                </span>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md"
                  style={{
                    backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : '#1e293b',
                    color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8',
                  }}
                >
                  {algorithm.name}
                </span>
              </div>

              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                {currentCard.back?.media?.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setZoomedImage({
                      url: currentCard.back!.media!.imageUrl!,
                      caption: currentCard.back!.media!.imageCaption || 'Answer image'
                    })}
                    className="p-1.5 rounded-xl transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : undefined,
                      color: activeSkin ? activeSkin.colors.textSecondary : undefined,
                    }}
                    title="Zoom image full screen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleTts(getCardBackText(currentCard))}
                  disabled={ttsActive}
                  className="p-1.5 rounded-xl transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : undefined,
                    color: activeSkin ? activeSkin.colors.textSecondary : undefined,
                  }}
                  title="Speak answer aloud"
                >
                  <Volume2 className={`w-4 h-4 ${ttsActive ? 'animate-pulse text-emerald-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Back Content - Generous answer & high-yield insight presentation */}
            <div className="flex-1 w-full overflow-y-auto my-auto py-3 px-1 sm:px-4 flex flex-col justify-center items-center text-center custom-scrollbar">
              {currentCard.back?.media?.imageUrl && (
                <div
                  className="my-2.5 max-h-44 sm:max-h-56 md:max-h-60 overflow-hidden rounded-2xl mx-auto shadow-md border group/img relative"
                  style={{ borderColor: activeSkin ? activeSkin.colors.border : '#334155' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedImage({
                      url: currentCard.back!.media!.imageUrl!,
                      caption: currentCard.back!.media!.imageCaption || 'Answer image'
                    });
                  }}
                >
                  <img
                    src={currentCard.back.media.imageUrl}
                    alt={currentCard.back.media.imageCaption || 'Answer visual'}
                    className="max-h-44 sm:max-h-56 md:max-h-60 w-auto object-contain rounded-2xl transition-transform group-hover/img:scale-102"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-black/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 shadow">
                      <ZoomIn className="w-3.5 h-3.5" /> Tap to zoom
                    </span>
                  </div>
                </div>
              )}

              <div
                className={`w-full whitespace-pre-line ${getAnswerTextClass(getCardBackText(currentCard))}`}
                style={{ color: activeSkin ? activeSkin.colors.accent : '#34d399' }}
              >
                {renderRichText(getCardBackText(currentCard), activeSkin, true)}
              </div>

              {getCardExplanation(currentCard) && (
                <div
                  className="mt-4 w-full max-w-lg border rounded-2xl p-4 sm:p-5 text-xs sm:text-sm text-left shadow-sm transition-all"
                  style={{
                    backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : '#02061780',
                    borderColor: activeSkin ? activeSkin.colors.border : '#1e293b',
                    color: activeSkin ? activeSkin.colors.textPrimary : '#cbd5e1',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-1.5" style={{ color: activeSkin ? activeSkin.colors.accent : '#818cf8' }}>
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="uppercase tracking-wider text-[11px]">High-Yield Insight</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-line">
                    {renderRichText(getCardExplanation(currentCard)!, activeSkin)}
                  </p>
                </div>
              )}
            </div>

            {/* Back Tags & Rating Reminder */}
            <div
              className="pt-3 border-t flex items-center justify-between text-[11px] shrink-0"
              style={{
                borderColor: activeSkin ? activeSkin.colors.border : '#1e293b',
                color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8',
              }}
            >
              <div className="flex flex-wrap gap-1">
                {currentCard.tags.map(t => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-full border text-[10px]"
                    style={{
                      backgroundColor: activeSkin ? activeSkin.colors.surfaceHover : '#1e293b',
                      borderColor: activeSkin ? activeSkin.colors.border : '#334155',
                      color: activeSkin ? activeSkin.colors.textSecondary : '#94a3b8',
                    }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
              <span className="font-mono opacity-80 hidden sm:inline">Rate recall below [Keys: 1-4]</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Action / Spaced Repetition Buttons Bar */}
      <div className="mt-4 pt-2">
        {!isFlipped ? (
          <button
            type="button"
            onClick={() => setIsFlipped(true)}
            className="w-full py-4 font-bold text-sm sm:text-base rounded-2xl shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: activeSkin ? activeSkin.colors.accent : '#4f46e5',
              color: activeSkin ? activeSkin.colors.accentText : '#ffffff',
              boxShadow: activeSkin ? `0 6px 20px ${activeSkin.colors.accentGlow}` : undefined,
            }}
          >
            <span>Show Answer</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-black/25 font-mono ml-1 hidden sm:inline">Space</span>
            <RotateCw className="w-4 h-4" />
          </button>
        ) : (
          <div className="space-y-2">
            <div className={`grid gap-2.5 ${algorithm.availableRatings.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
              {algorithm.availableRatings.map(({ rating, label, color }, rIdx) => {
                const intervalPreview = (predictedIntervals as any)[rating];
                return (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleRate(rating)}
                    className={`py-3.5 px-3 rounded-2xl font-bold text-xs shadow-md transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${color} relative`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black">{label}</span>
                      <span className="text-[10px] opacity-75 font-mono px-1 py-0.2 bg-black/20 rounded">
                        {rIdx + 1}
                      </span>
                    </div>
                    {intervalPreview && (
                      <span className="text-[11px] font-mono opacity-90 font-medium">
                        {intervalPreview}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors shadow-lg"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={zoomedImage.url}
            alt={zoomedImage.caption || 'Expanded image'}
            className="max-h-[85vh] max-w-[95vw] object-contain rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          {zoomedImage.caption && (
            <p className="mt-3 text-sm text-slate-300 text-center font-medium max-w-md bg-black/60 px-4 py-1.5 rounded-xl">
              {zoomedImage.caption}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
