import { AlgorithmType, Flashcard, ReviewRating, SpacedRepetitionResult, ReviewQueueStats } from '../types';

export interface ISpacedRepetitionAlgorithm {
  readonly type: AlgorithmType;
  readonly name: string;
  readonly description: string;
  readonly availableRatings: { rating: ReviewRating; label: string; color: string; description: string }[];

  calculateNextReview(card: Flashcard, rating: ReviewRating, now?: Date): SpacedRepetitionResult;
  getPredictedIntervals(card: Flashcard, now?: Date): Record<ReviewRating, string>;
  isDue(card: Flashcard, now?: Date): boolean;
}

/**
 * Leitner 5-Box System
 * Box 1: 1 day
 * Box 2: 3 days
 * Box 3: 7 days
 * Box 4: 14 days
 * Box 5: 30 days (Mastered)
 * On incorrect (Again/Hard): falls back to Box 1
 * On correct (Good/Easy): advances to next box
 */
export class LeitnerAlgorithm implements ISpacedRepetitionAlgorithm {
  readonly type: AlgorithmType = 'leitner';
  readonly name = 'Leitner 5-Box';
  readonly description = 'Classic flashcard box progression. Correct answers graduate up; incorrect reset to Box 1.';

  readonly availableRatings = [
    { rating: 'again' as ReviewRating, label: 'Incorrect', color: 'bg-rose-500 hover:bg-rose-600 text-white', description: 'Reset to Box 1' },
    { rating: 'good' as ReviewRating, label: 'Correct', color: 'bg-emerald-500 hover:bg-emerald-600 text-white', description: 'Advance +1 Box' },
  ];

  private readonly boxIntervals = [1, 3, 7, 14, 30]; // in days

  calculateNextReview(card: Flashcard, rating: ReviewRating, now: Date = new Date()): SpacedRepetitionResult {
    let currentBox = card.leitnerBox || 1;
    let nextBox = currentBox;

    if (rating === 'again' || rating === 'hard') {
      nextBox = 1; // Reset
    } else {
      nextBox = Math.min(5, currentBox + 1); // Advance
    }

    const intervalDays = this.boxIntervals[nextBox - 1] || 1;
    const nextDueDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

    return {
      nextDueDate,
      nextIntervalDays: intervalDays,
      nextBox,
      newEaseFactor: card.easeFactor || 2.5,
      newRepetitions: (card.repetitions || 0) + (rating === 'again' ? 0 : 1),
      ratingLabel: `Box ${nextBox} (${intervalDays}d)`,
    };
  }

  getPredictedIntervals(card: Flashcard): Record<ReviewRating, string> {
    const currentBox = card.leitnerBox || 1;
    const nextBox = Math.min(5, currentBox + 1);
    return {
      again: 'Box 1 (1d)',
      hard: 'Box 1 (1d)',
      good: `Box ${nextBox} (${this.boxIntervals[nextBox - 1]}d)`,
      easy: `Box ${Math.min(5, nextBox + 1)} (${this.boxIntervals[Math.min(4, nextBox)]}d)`,
    };
  }

  isDue(card: Flashcard, now: Date = new Date()): boolean {
    if (!card.dueDate) return true;
    return new Date(card.dueDate).getTime() <= now.getTime();
  }
}

/**
 * SuperMemo SM-2 Algorithm
 * Standard spaced repetition algorithm with dynamic ease factors and repetition intervals.
 * EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 * Interval(1) = 1 day, Interval(2) = 6 days, Interval(n) = Interval(n-1) * EF
 */
export class SM2Algorithm implements ISpacedRepetitionAlgorithm {
  readonly type: AlgorithmType = 'sm2';
  readonly name = 'SuperMemo SM-2';
  readonly description = 'Adaptive spaced repetition with dynamic ease factor calculations based on recall difficulty.';

  readonly availableRatings = [
    { rating: 'again' as ReviewRating, label: 'Again', color: 'bg-rose-500 hover:bg-rose-600 text-white', description: 'Complete blackout' },
    { rating: 'hard' as ReviewRating, label: 'Hard', color: 'bg-amber-500 hover:bg-amber-600 text-white', description: 'Recalled with hesitation' },
    { rating: 'good' as ReviewRating, label: 'Good', color: 'bg-blue-500 hover:bg-blue-600 text-white', description: 'Optimal recall' },
    { rating: 'easy' as ReviewRating, label: 'Easy', color: 'bg-emerald-500 hover:bg-emerald-600 text-white', description: 'Immediate effortless recall' },
  ];

  private ratingToGrade(rating: ReviewRating): number {
    switch (rating) {
      case 'again': return 1;
      case 'hard': return 2;
      case 'good': return 4;
      case 'easy': return 5;
    }
  }

  calculateNextReview(card: Flashcard, rating: ReviewRating, now: Date = new Date()): SpacedRepetitionResult {
    const grade = this.ratingToGrade(rating);
    let easeFactor = card.easeFactor || 2.5;
    let repetitions = card.repetitions || 0;
    let interval = card.interval || 0;

    // Calculate new Ease Factor
    easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    if (grade < 3) {
      // Failed recall
      repetitions = 0;
      interval = 1;
    } else {
      // Successful recall
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = rating === 'easy' ? 4 : 2;
      } else {
        const multiplier = rating === 'easy' ? easeFactor * 1.3 : easeFactor;
        interval = Math.round(interval * multiplier);
      }
      repetitions += 1;
    }

    const nextDueDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
    const nextBox = Math.min(5, Math.max(1, Math.floor(interval / 5) + 1));

    return {
      nextDueDate,
      nextIntervalDays: interval,
      nextBox,
      newEaseFactor: Number(easeFactor.toFixed(2)),
      newRepetitions: repetitions,
      ratingLabel: `${interval} day${interval > 1 ? 's' : ''}`,
    };
  }

  getPredictedIntervals(card: Flashcard, now: Date = new Date()): Record<ReviewRating, string> {
    const testAgain = this.calculateNextReview(card, 'again', now);
    const testHard = this.calculateNextReview(card, 'hard', now);
    const testGood = this.calculateNextReview(card, 'good', now);
    const testEasy = this.calculateNextReview(card, 'easy', now);

    return {
      again: `${testAgain.nextIntervalDays}d`,
      hard: `${testHard.nextIntervalDays}d`,
      good: `${testGood.nextIntervalDays}d`,
      easy: `${testEasy.nextIntervalDays}d`,
    };
  }

  isDue(card: Flashcard, now: Date = new Date()): boolean {
    if (!card.dueDate) return true;
    return new Date(card.dueDate).getTime() <= now.getTime();
  }
}

/**
 * Cram Mode
 * Review all cards freely without altering scheduled due dates or intervals.
 */
export class CramAlgorithm implements ISpacedRepetitionAlgorithm {
  readonly type: AlgorithmType = 'cram';
  readonly name = 'Cram / Quick Review';
  readonly description = 'Rapid review session. Cycles cards without altering long-term spaced repetition schedule.';

  readonly availableRatings = [
    { rating: 'again' as ReviewRating, label: 'Retry Later', color: 'bg-amber-500 hover:bg-amber-600 text-white', description: 'Re-queue in this session' },
    { rating: 'good' as ReviewRating, label: 'Got It', color: 'bg-emerald-500 hover:bg-emerald-600 text-white', description: 'Mark done for session' },
  ];

  calculateNextReview(card: Flashcard, rating: ReviewRating, now: Date = new Date()): SpacedRepetitionResult {
    return {
      nextDueDate: card.dueDate ? new Date(card.dueDate) : now,
      nextIntervalDays: card.interval || 1,
      nextBox: card.leitnerBox || 1,
      newEaseFactor: card.easeFactor || 2.5,
      newRepetitions: (card.repetitions || 0) + 1,
      ratingLabel: rating === 'again' ? 'Re-queued' : 'Cleared',
    };
  }

  getPredictedIntervals(): Record<ReviewRating, string> {
    return {
      again: 'Session',
      hard: 'Session',
      good: 'Pass',
      easy: 'Pass',
    };
  }

  isDue(): boolean {
    return true; // Everything is eligible for cramming
  }
}

/**
 * Modular Algorithm Registry & Factory
 */
const algorithms: Record<AlgorithmType, ISpacedRepetitionAlgorithm> = {
  leitner: new LeitnerAlgorithm(),
  sm2: new SM2Algorithm(),
  cram: new CramAlgorithm(),
};

export function getAlgorithm(type: AlgorithmType = 'leitner'): ISpacedRepetitionAlgorithm {
  return algorithms[type] || algorithms.leitner;
}

export function getAllAlgorithms(): ISpacedRepetitionAlgorithm[] {
  return Object.values(algorithms);
}

export function computeQueueStats(cards: Flashcard[], algorithmType: AlgorithmType = 'leitner'): ReviewQueueStats {
  const algo = getAlgorithm(algorithmType);
  const now = new Date();

  let due = 0;
  let learning = 0;
  let mastered = 0;

  for (const card of cards) {
    if (algo.isDue(card, now)) {
      due++;
    }
    if ((card.leitnerBox && card.leitnerBox >= 4) || (card.interval && card.interval >= 21)) {
      mastered++;
    } else {
      learning++;
    }
  }

  return {
    due,
    learning,
    mastered,
    total: cards.length,
  };
}
