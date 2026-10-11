import { useMemo } from 'react';
import {
  BarChart3, Flame, Trophy, CheckCircle2, Clock,
  Brain, Layers, Sparkles, Zap
} from 'lucide-react';
import { Deck, Flashcard } from '../types';
import { getAlgorithm } from '../algorithms/spacedRepetition';
import { Skin } from '../utils/skins';

interface StatsViewProps {
  decks: Deck[];
  cards: Flashcard[];
  activeSkin?: Skin;
}

export function StatsView({ decks, cards, activeSkin }: StatsViewProps) {
  const stats = useMemo(() => {
    let dueCount = 0;
    let masteredCount = 0;
    let learningCount = 0;
    let newCount = 0;
    let totalReviews = 0;
    const boxDistribution = [0, 0, 0, 0, 0];

    cards.forEach(c => {
      const deck = decks.find(d => d.id === c.deckId);
      const algo = getAlgorithm(deck?.algorithm || 'leitner');
      if (algo.isDue(c)) dueCount++;

      const box = Math.min(5, Math.max(1, c.leitnerBox || 1));
      boxDistribution[box - 1]++;

      if ((c.reviewCount || 0) === 0) {
        newCount++;
      } else if (box === 5 || (c.interval || 0) >= 21) {
        masteredCount++;
      } else {
        learningCount++;
      }

      totalReviews += (c.reviewCount || 0);
    });

    const masteryPct = cards.length > 0 ? Math.round((masteredCount / cards.length) * 100) : 0;

    return {
      totalCards: cards.length,
      dueCount,
      masteredCount,
      learningCount,
      newCount,
      totalReviews,
      masteryPct,
      boxDistribution,
    };
  }, [decks, cards]);

  const surfaceBg = activeSkin?.colors.surface || '#0f172a';
  const surfaceHover = activeSkin?.colors.surfaceHover || '#1e293b';
  const borderColor = activeSkin?.colors.border || '#1e293b';
  const textPrimary = activeSkin?.colors.textPrimary || '#f8fafc';
  const textSecondary = activeSkin?.colors.textSecondary || '#94a3b8';
  const accentColor = activeSkin?.colors.accent || '#6366f1';
  const accentGlow = activeSkin?.colors.accentGlow || 'rgba(99, 102, 241, 0.4)';

  return (
    <div className="space-y-5 max-w-3xl mx-auto px-4 py-4 pb-24 select-none">
      
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: textPrimary }}>
          <BarChart3 className="w-5 h-5" style={{ color: accentColor }} />
          Memory Analytics & Mastery
        </h1>
        <p className="text-xs mt-0.5" style={{ color: textSecondary }}>
          Spaced repetition retention metrics across your study decks
        </p>
      </div>

      {/* Hero Stats Card */}
      <div
        className="border rounded-3xl p-5 sm:p-6 shadow-xl transition-all"
        style={{
          backgroundColor: surfaceBg,
          borderColor: borderColor,
          boxShadow: `0 8px 30px -10px ${accentGlow}`,
        }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="space-y-1">
            <span className="flex items-center justify-center text-amber-400 gap-1 text-xs font-semibold">
              <Flame className="w-4 h-4 fill-amber-400" /> Streak
            </span>
            <span className="text-2xl sm:text-3xl font-black" style={{ color: textPrimary }}>7 Days</span>
            <span className="block text-[11px]" style={{ color: textSecondary }}>Consistent study</span>
          </div>

          <div className="space-y-1">
            <span className="flex items-center justify-center text-emerald-400 gap-1 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Mastery
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">{stats.masteryPct}%</span>
            <span className="block text-[11px]" style={{ color: textSecondary }}>{stats.masteredCount} cards mastered</span>
          </div>

          <div className="space-y-1">
            <span className="flex items-center justify-center gap-1 text-xs font-semibold" style={{ color: accentColor }}>
              <Zap className="w-4 h-4" /> Total Reviews
            </span>
            <span className="text-2xl sm:text-3xl font-black" style={{ color: accentColor }}>{stats.totalReviews}</span>
            <span className="block text-[11px]" style={{ color: textSecondary }}>Card reps logged</span>
          </div>

          <div className="space-y-1">
            <span className="flex items-center justify-center text-rose-400 gap-1 text-xs font-semibold">
              <Clock className="w-4 h-4" /> Due Now
            </span>
            <span className="text-2xl sm:text-3xl font-black text-rose-400">{stats.dueCount}</span>
            <span className="block text-[11px]" style={{ color: textSecondary }}>Scheduled for today</span>
          </div>
        </div>
      </div>

      {/* Leitner Box Spaced Repetition Distribution */}
      <div
        className="border rounded-3xl p-5 space-y-4 transition-all"
        style={{
          backgroundColor: surfaceBg,
          borderColor: borderColor,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4" style={{ color: accentColor }} />
            <h2 className="text-sm font-bold" style={{ color: textPrimary }}>Leitner 5-Box Distribution</h2>
          </div>
          <span className="text-xs font-mono" style={{ color: textSecondary }}>
            {stats.totalCards} Total Cards
          </span>
        </div>

        <div className="space-y-2">
          {stats.boxDistribution.map((count, index) => {
            const pct = stats.totalCards > 0 ? Math.round((count / stats.totalCards) * 100) : 0;
            const boxLabels = [
              'Box 1 · Daily (Active Recall)',
              'Box 2 · Every 2 Days',
              'Box 3 · Every 4 Days',
              'Box 4 · Every 9 Days',
              'Box 5 · Mastered (14+ Days)',
            ];
            const colors = [
              'bg-rose-500',
              'bg-amber-500',
              'bg-indigo-500',
              'bg-cyan-500',
              'bg-emerald-500',
            ];

            return (
              <div key={index} className="space-y-1 text-xs">
                <div className="flex items-center justify-between font-medium" style={{ color: textPrimary }}>
                  <span>{boxLabels[index]}</span>
                  <span className="font-mono" style={{ color: textSecondary }}>{count} cards ({pct}%)</span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: surfaceHover }}
                >
                  <div
                    className={`h-full ${colors[index]} rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deck Breakdown Table */}
      <div
        className="border rounded-3xl p-5 space-y-3 transition-all"
        style={{
          backgroundColor: surfaceBg,
          borderColor: borderColor,
        }}
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" style={{ color: accentColor }} />
          <h2 className="text-sm font-bold" style={{ color: textPrimary }}>Deck Performance Breakdown</h2>
        </div>

        <div className="space-y-2">
          {decks.map(deck => {
            const deckCards = cards.filter(c => c.deckId === deck.id);
            const algo = getAlgorithm(deck.algorithm);
            const due = deckCards.filter(c => algo.isDue(c)).length;

            return (
              <div
                key={deck.id}
                className="flex items-center justify-between p-3 border rounded-2xl text-xs transition-colors"
                style={{
                  backgroundColor: surfaceHover,
                  borderColor: borderColor,
                }}
              >
                <div>
                  <span className="font-bold block" style={{ color: textPrimary }}>{deck.title}</span>
                  <span className="text-[11px]" style={{ color: textSecondary }}>{algo.name} · {deckCards.length} cards</span>
                </div>
                <div className="text-right">
                  <span className={`font-semibold ${due > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {due} Due
                  </span>
                  <span className="block text-[10px] font-mono" style={{ color: textSecondary }}>v{deck.version || '1.0.0'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
