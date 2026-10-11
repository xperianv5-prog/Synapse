import { Flashcard } from '../types';

export function normalizeCard(c: any): Flashcard {
  const frontText = getCardFrontText(c);
  const backText = getCardBackText(c);
  const backExplanation = getCardExplanation(c);

  const frontMedia = c.front?.media || c.frontMedia;
  const backMedia = c.back?.media || c.backMedia;

  return {
    ...c,
    id: c.id || `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    deckId: c.deckId || 'default',
    front: {
      text: frontText || 'Question prompt',
      media: frontMedia,
    },
    back: {
      text: backText || 'Answer explanation',
      explanation: backExplanation,
      media: backMedia,
    },
    hint: c.hint,
    tags: Array.isArray(c.tags) ? c.tags : (c.tag ? [c.tag] : ['Study']),
    createdAt: c.createdAt || new Date().toISOString(),
    updatedAt: c.updatedAt || new Date().toISOString(),
    leitnerBox: c.leitnerBox || 1,
    repetitions: c.repetitions || 0,
    interval: c.interval || 0,
    easeFactor: c.easeFactor || 2.5,
    dueDate: c.dueDate || new Date().toISOString(),
    lastReviewed: c.lastReviewed || null,
    reviewCount: c.reviewCount || 0,
    lapseCount: c.lapseCount || 0,
  };
}

export function getCardFrontText(card: any): string {
  if (!card) return '';

  const candidates = [
    typeof card.front === 'string' ? card.front : null,
    card.front?.text,
    card.front?.front,
    card.front?.question,
    card.front?.prompt,
    card.frontText,
    card.question,
    card.prompt,
    card.title,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      return c.trim();
    }
    if (c && typeof c === 'object') {
      const nested = c.text || c.front || c.question || c.prompt;
      if (typeof nested === 'string' && nested.trim().length > 0) {
        return nested.trim();
      }
    }
  }

  const f = card.front;
  if (f && typeof f === 'object') {
    for (const val of Object.values(f)) {
      if (typeof val === 'string' && val.trim().length > 0) return val.trim();
    }
  }

  for (const [key, val] of Object.entries(card)) {
    if ((key.includes('front') || key.includes('question') || key.includes('prompt')) && typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }

  return card.id ? `Card #${card.id.slice(-4)}` : 'Question prompt';
}

export function getCardBackText(card: any): string {
  if (!card) return '';

  const candidates = [
    typeof card.back === 'string' ? card.back : null,
    card.back?.text,
    card.back?.back,
    card.back?.answer,
    card.backText,
    card.answer,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      return c.trim();
    }
    if (c && typeof c === 'object') {
      const nested = c.text || c.back || c.answer;
      if (typeof nested === 'string' && nested.trim().length > 0) {
        return nested.trim();
      }
    }
  }

  const b = card.back;
  if (b && typeof b === 'object') {
    for (const val of Object.values(b)) {
      if (typeof val === 'string' && val.trim().length > 0) return val.trim();
    }
  }

  for (const [key, val] of Object.entries(card)) {
    if ((key.includes('back') || key.includes('answer')) && typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }

  return 'Answer explanation';
}

export function getCardExplanation(card: any): string {
  if (!card) return '';
  const b = card.back;
  if (b && typeof b === 'object' && typeof b.explanation === 'string') return b.explanation;
  if (typeof card.explanation === 'string') return card.explanation;
  if (typeof card.backExplanation === 'string') return card.backExplanation;
  return '';
}
