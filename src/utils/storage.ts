import { Deck, Flashcard } from '../types';
import { INITIAL_DECKS, INITIAL_CARDS } from '../data/initialData';
import { normalizeCard } from './cardHelpers';

const DECKS_KEY = 'recall_android_decks_v1';
const CARDS_KEY = 'recall_android_cards_v1';
const PREFS_KEY = 'recall_android_prefs_v1';

export interface AppPreferences {
  theme: 'dark' | 'light';
  soundEffects: boolean;
  haptics: boolean;
  dailyGoal: number; // cards per day
  defaultAlgorithm: 'leitner' | 'sm2' | 'cram';
}

export const DEFAULT_PREFS: AppPreferences = {
  theme: 'dark',
  soundEffects: true,
  haptics: true,
  dailyGoal: 20,
  defaultAlgorithm: 'sm2',
};

export function loadDecks(): Deck[] {
  try {
    const raw = localStorage.getItem(DECKS_KEY);
    if (!raw) {
      saveDecks(INITIAL_DECKS);
      return INITIAL_DECKS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DECKS;
  } catch (err) {
    console.error('Error loading decks:', err);
    return INITIAL_DECKS;
  }
}

export function saveDecks(decks: Deck[]): void {
  try {
    localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
  } catch (err) {
    console.error('Error saving decks:', err);
  }
}

export function loadCards(): Flashcard[] {
  try {
    const raw = localStorage.getItem(CARDS_KEY);
    if (!raw) {
      const normalizedInitial = INITIAL_CARDS.map(normalizeCard);
      saveCards(normalizedInitial);
      return normalizedInitial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(normalizeCard);
    }
    const normalizedInitial = INITIAL_CARDS.map(normalizeCard);
    return normalizedInitial;
  } catch (err) {
    console.error('Error loading cards:', err);
    return INITIAL_CARDS.map(normalizeCard);
  }
}

export function saveCards(cards: Flashcard[]): void {
  try {
    localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
  } catch (err) {
    console.error('Error saving cards:', err);
  }
}

export const loadStoredDecks = loadDecks;
export const saveStoredDecks = saveDecks;
export const loadStoredCards = loadCards;
export const saveStoredCards = saveCards;

export function loadPreferences(): AppPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePreferences(prefs: AppPreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.error('Error saving preferences:', err);
  }
}
