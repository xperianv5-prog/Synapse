export type AlgorithmType = 'leitner' | 'sm2' | 'cram';

export interface CardMedia {
  imageUrl?: string;
  imageCaption?: string;
  audioData?: string; // base64 data URI or audio URL
  audioDuration?: number; // in seconds
  mimeType?: string;
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: {
    text: string;
    media?: CardMedia;
  };
  back: {
    text: string;
    explanation?: string;
    media?: CardMedia;
  };
  hint?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  
  // Leitner algorithm fields
  leitnerBox: number; // 1 to 5

  // SM-2 algorithm fields
  repetitions: number;
  interval: number; // in days
  easeFactor: number; // default 2.5
  dueDate: string; // ISO date string
  lastReviewed: string | null;

  // Stats
  reviewCount: number;
  lapseCount: number;
}

export interface DeckSharingControl {
  isPublic: boolean;
  allowRemix: boolean;
  accessCode?: string;
  authorName: string;
  license: string;
  changelog?: string;
}

export interface DeckVersion {
  version: string;
  date: string;
  notes: string;
  cardsCount: number;
}

export interface Deck {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  color: string;
  icon?: string;
  algorithm: AlgorithmType;
  version: string;
  versionHistory: DeckVersion[];
  sharingControl: DeckSharingControl;
  createdAt: string;
  updatedAt: string;
  cardCount?: number;
  communityId?: string;
  isCommunityShared?: boolean;
  isFavorite?: boolean;
}

export interface CommunityDeck {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  authorAvatar?: string;
  downloads: number;
  likes: number;
  userLiked?: boolean;
  version: string;
  updatedDate: string;
  cardCount: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  rating: number;
  reviewsCount: number;
  versions: { version: string; date: string; notes: string }[];
  sharingControl: {
    allowRemix: boolean;
    license: string;
    isVerified?: boolean;
  };
  sampleCards: {
    frontText: string;
    backText: string;
    hasImage?: boolean;
    hasAudio?: boolean;
  }[];
  cards: Flashcard[];
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface SpacedRepetitionResult {
  nextDueDate: Date;
  nextIntervalDays: number;
  nextBox: number;
  newEaseFactor: number;
  newRepetitions: number;
  ratingLabel: string;
}

export interface ReviewQueueStats {
  due: number;
  learning: number;
  mastered: number;
  total: number;
}
