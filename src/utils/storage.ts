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

const RESOURCES_KEY = 'recall_android_resources_v1';

export const INITIAL_RESOURCES: import('../types').StudyResource[] = [
  {
    id: 'res-intro-pharmacology',
    title: 'Pharmacology Lecture: Autonomic Nervous System & Adrenergic Receptors',
    type: 'text',
    content: `Autonomic Nervous System (ANS) Pharmacology Overview:
1. Sympathetic Nervous System (Flight or Fight):
- Alpha-1 Adrenergic Receptors: Gq-coupled, activates Phospholipase C (PLC), increases IP3 and DAG, elevates intracellular Calcium. Causes peripheral vasoconstriction, pupillary dilation (mydriasis), and urinary sphincter contraction.
- Alpha-2 Adrenergic Receptors: Gi-coupled, inhibits adenylate cyclase, lowers cAMP. Located presynaptically to mediate negative feedback inhibition of norepinephrine release.
- Beta-1 Adrenergic Receptors: Gs-coupled, stimulates adenylate cyclase, increases cAMP and protein kinase A (PKA). Predominantly located in cardiac tissue. Increases heart rate (chronotropy), contractility (inotropy), and dromotropy. Also stimulates renin release from renal juxtaglomerular cells.
- Beta-2 Adrenergic Receptors: Gs-coupled, increases cAMP. Causes bronchodilation, vasodilation in skeletal muscle vascular beds, and uterine relaxation (tocolysis).

2. Clinical Pearls for Board Exams:
- Epinephrine reversal: When an alpha-blocker (e.g. phentolamine or phenoxybenzamine) is administered before epinephrine, epinephrine's net effect reverses from hypertension to hypotension due to unopposed beta-2 vasodilation.
- Selective Beta-1 Blockers (Cardioselective): Metoprolol, Atenolol, Esmolol, Bisoprolol ("A to M" mnemonic). Safer in patients with asthma/COPD.
- Non-selective Beta Blockers: Propranolol, Nadolol, Timolol. Cause bronchoconstriction via beta-2 antagonism.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['Pharmacology', 'Lecture Notes', 'High-Yield'],
    fileSize: '1.4 KB',
    notes: `Executive Summary:
Adrenergic receptor subtypes follow distinct G-protein second messenger cascades (Alpha-1 Gq, Alpha-2 Gi, Beta-1/Beta-2 Gs). Beta-1 is cardiac and renin-stimulating; Beta-2 mediates bronchodilation and skeletal vasodilation. Selective beta-blockers (A-M) spare beta-2 bronchodilation in reactive airway disease.`,
  },
  {
    id: 'res-biology-glycolysis',
    title: 'Biochemistry Summary: Glycolysis & Rate-Limiting Enzymes',
    type: 'pdf',
    content: `Glycolysis Pathways and Regulation:
- Location: Cytoplasm of all living cells.
- Net Yield: 1 Glucose yields 2 Pyruvate, 2 net ATP (4 produced, 2 consumed), and 2 NADH.
- Rate-Limiting Step: Phosphofructokinase-1 (PFK-1).
  * Positively regulated by: AMP, Fructose-2,6-bisphosphate (most potent allosteric activator, regulated by PFK-2/FBPase-2 bi-functional enzyme).
  * Negatively regulated by: ATP, Citrate.
- Hexokinase vs. Glucokinase:
  * Hexokinase: Most tissues, low Km (high affinity), low Vmax, inhibited by Glucose-6-phosphate.
  * Glucokinase: Liver and pancreatic beta-cells, high Km (low affinity), high Vmax, induced by insulin, NOT inhibited by Glucose-6-phosphate. Acts as blood glucose sensor.
- Clinical Correlate: Pyruvate kinase deficiency causes hemolytic anemia due to erythrocyte inability to sustain ATP generation for Na+/K+ ATPase membrane integrity.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['Biochemistry', 'Metabolism', 'Enzymes'],
    fileSize: '1.1 KB',
    notes: `Core Takeaways:
PFK-1 is the primary rate-limiting and committed step of glycolysis. Fructose-2,6-bisphosphate is the key allosteric regulator. Glucokinase in liver/pancreas acts as a high-capacity sensor, while Hexokinase in peripheral tissues maintains basal glucose trapping.`,
  },
];

export function loadResources(): import('../types').StudyResource[] {
  try {
    const raw = localStorage.getItem(RESOURCES_KEY);
    if (!raw) {
      saveResources(INITIAL_RESOURCES);
      return INITIAL_RESOURCES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_RESOURCES;
  } catch (err) {
    console.error('Error loading resources:', err);
    return INITIAL_RESOURCES;
  }
}

export function saveResources(resources: import('../types').StudyResource[]): void {
  try {
    localStorage.setItem(RESOURCES_KEY, JSON.stringify(resources));
  } catch (err) {
    console.error('Error saving resources:', err);
  }
}

export const loadStoredResources = loadResources;
export const saveStoredResources = saveResources;

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

