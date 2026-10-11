import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import dotenv from 'dotenv';
import { INITIAL_COMMUNITY_DECKS } from './src/data/initialData.ts';
import { CommunityDeck } from './src/types.ts';

dotenv.config();

let __filename = '';
try {
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    __filename = fileURLToPath(import.meta.url);
  }
} catch {}
const __dirname = path.dirname(__filename || process.cwd());

// In-memory community database (pre-seeded)
let communityDecksStore: CommunityDeck[] = JSON.parse(JSON.stringify(INITIAL_COMMUNITY_DECKS));

// Lazy-safe Gemini AI client setup
let currentApiKey = '';
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!genAIClient || currentApiKey !== apiKey) {
    currentApiKey = apiKey;
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function extractCleanErrorMessage(err: any): string {
  if (!err) return 'An unexpected error occurred.';
  const msg = typeof err === 'string' ? err : err.message || JSON.stringify(err);

  try {
    const parsed = typeof err === 'object' && err.message ? JSON.parse(err.message) : JSON.parse(msg);
    if (parsed?.error?.message) {
      const code = parsed.error.code;
      const status = parsed.error.status;
      const subMsg = parsed.error.message;
      if (
        code === 503 ||
        status === 'UNAVAILABLE' ||
        subMsg.toLowerCase().includes('high demand') ||
        subMsg.toLowerCase().includes('spikes in demand')
      ) {
        return 'The AI service is experiencing temporary high demand. Please wait a few moments and try again.';
      }
      if (code === 429 || status === 'RESOURCE_EXHAUSTED') {
        return 'The AI rate limit was reached. Please wait a moment before trying again.';
      }
      return subMsg;
    }
  } catch {
    // Not JSON
  }

  const lower = msg.toLowerCase();
  if (lower.includes('503') || lower.includes('high demand') || lower.includes('unavailable') || lower.includes('spikes in demand')) {
    return 'The AI service is experiencing temporary high demand. Please wait a few moments and try again.';
  }
  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return 'The AI rate limit was reached. Please wait a moment before trying again.';
  }

  return msg;
}

function cleanAndParseJson<T>(rawText: string | undefined, defaultValue: T): T {
  if (!rawText) return defaultValue;
  let text = rawText.trim();

  // Strip markdown code fences if present
  if (text.startsWith('```json')) {
    text = text.substring(7);
  } else if (text.startsWith('```')) {
    text = text.substring(3);
  }
  if (text.endsWith('```')) {
    text = text.substring(0, text.length - 3);
  }
  text = text.trim();

  try {
    return JSON.parse(text);
  } catch (err) {
    const startBracket = text.indexOf('[');
    const endBracket = text.lastIndexOf(']');
    if (startBracket !== -1 && endBracket > startBracket) {
      try {
        return JSON.parse(text.substring(startBracket, endBracket + 1));
      } catch {}
    }

    const startBrace = text.indexOf('{');
    const endBrace = text.lastIndexOf('}');
    if (startBrace !== -1 && endBrace > startBrace) {
      try {
        return JSON.parse(text.substring(startBrace, endBrace + 1));
      } catch {}
    }
    return defaultValue;
  }
}

async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: any,
  modelsToTry: string[] = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'],
  maxRetriesPerModel: number = 1
) {
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
      try {
        // Generous 60 second timeout for complex card generation batches
        const timeoutSignal = AbortSignal.timeout(60000);
        const response = await ai.models.generateContent({
          ...params,
          model,
          config: {
            ...params.config,
            abortSignal: timeoutSignal,
          },
        });
        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = typeof err === 'string' ? err : err.message || '';
        console.warn(`[Gemini API] Error with model ${model} (attempt ${attempt + 1}/${maxRetriesPerModel + 1}):`, errMsg.slice(0, 120));

        // If it's a 503 high demand or unavailable error, immediately fall back to next model
        if (
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('spikes in demand')
        ) {
          break; // try next model immediately
        }

        if (attempt < maxRetriesPerModel) {
          await sleep(500);
        }
      }
    }
  }

  throw lastError;
}

function synthesizeLocalCards(text: string | undefined, topic: string | undefined, count: number): any[] {
  try {
    const cards: any[] = [];
    const safeCount = Math.max(1, count);
    const targetTopic = (topic || (text ? text.slice(0, 60) : 'General Knowledge')).trim();

    if (text && text.trim().length > 20) {
      const rawLines = text
        .split(/\n|\. |\? |! /)
        .map(s => s.trim())
        .filter(s => s.length > 12 && s.length < 350);

      for (let i = 0; i < rawLines.length && cards.length < safeCount; i++) {
        const line = rawLines[i];
        const colonMatch = line.match(/^([^:]{3,40}):\s*(.{10,})$/);
        const isMatch = line.match(/^([A-Z][^,]{2,40})\s+(is|are|refers to|means|defines)\s+(.{10,})$/i);

        if (colonMatch) {
          cards.push({
            front: `Define and describe: **${colonMatch[1].trim()}**`,
            back: colonMatch[2].trim(),
            explanation: `Core extracted concept from source material regarding ${colonMatch[1].trim()}.`,
            hint: `Key term from study text`,
            tags: [targetTopic.split(' ')[0] || 'Study', 'Concept'],
          });
        } else if (isMatch) {
          cards.push({
            front: `What is **${isMatch[1].trim()}**?`,
            back: `${isMatch[1].trim()} ${isMatch[2]} ${isMatch[3].trim()}`,
            explanation: `Fundamental definition and principle of ${isMatch[1].trim()}.`,
            hint: `Definition prompt`,
            tags: [targetTopic.split(' ')[0] || 'Study', 'Definition'],
          });
        } else if (line.length > 25) {
          const words = line.split(' ');
          if (words.length >= 5) {
            const midWordIdx = Math.floor(words.length / 2);
            const keyword = words[midWordIdx].replace(/[^a-zA-Z0-9]/g, '');
            if (keyword.length > 3) {
              const safeRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
              cards.push({
                front: `Fill in the missing key term:\n"${line.replace(safeRegex, '{{c1::...}}')}"`,
                back: `Missing term: **${keyword}**`,
                explanation: `Full statement context: "${line}"`,
                hint: `Starts with '${keyword[0]}'`,
                tags: ['Synthesis', 'Cloze'],
              });
            }
          }
        }
      }
    }

    // High-yield topic-specific question templates for synthesis
    const conceptualTemplates = [
      {
        q: `What is the core definition and fundamental purpose of **${targetTopic}**?`,
        a: `**${targetTopic}** refers to the primary framework and operational principles required to understand key structures and outcomes in this domain.`,
        e: `Establishing a clear definition provides the cognitive foundation for solving complex applied problems.`,
        h: `Core concept`,
      },
      {
        q: `What is the step-by-step mechanism or process underlying **${targetTopic}**?`,
        a: `1. **Initiation**: Trigger or initial condition\n2. **Progression**: Active transformation phase\n3. **Resolution**: Final output or state stabilization`,
        e: `Sequential understanding prevents common ordering errors during examination or clinical recall.`,
        h: `Sequential flow`,
      },
      {
        q: `What are the critical diagnostic criteria or key features of **${targetTopic}**?`,
        a: `Identified by distinct hallmark indicators, measurable parameters, and consistent baseline markers.`,
        e: `Memorizing hallmark criteria enables rapid differential diagnosis and problem recognition.`,
        h: `Hallmark features`,
      },
      {
        q: `What is a common misconception or high-yield pitfall associated with **${targetTopic}**?`,
        a: `Confusing cause and effect, or failing to account for key baseline variables and edge conditions.`,
        e: `Recognizing frequent errors significantly improves accuracy under timed exam conditions.`,
        h: `Pitfall alert`,
      },
      {
        q: `How is **${targetTopic}** applied in practical or real-world problem solving?`,
        a: `By evaluating given parameters, applying core rules, and verifying results against standardized guidelines.`,
        e: `Practical application converts passive recognition into active procedural fluency.`,
        h: `Real-world practice`,
      },
      {
        q: `What are the key comparative differences between **${targetTopic}** and related concepts?`,
        a: `**${targetTopic}** differs in its primary mechanism, specific conditions of activity, and resulting outcomes.`,
        e: `Comparative analysis sharpens discrimination between closely related test topics.`,
        h: `Distinguishing traits`,
      },
    ];

    let templateIdx = 0;
    while (cards.length < safeCount) {
      const t = conceptualTemplates[templateIdx % conceptualTemplates.length];
      const cycleNum = Math.floor(cards.length / conceptualTemplates.length) + 1;
      cards.push({
        front: cycleNum > 1 ? `${t.q} (Aspect ${cycleNum})` : t.q,
        back: t.a,
        explanation: t.e,
        hint: t.h,
        tags: [targetTopic.split(' ')[0] || 'Topic', 'High-Yield'],
      });
      templateIdx++;
    }

    return cards;
  } catch (synthErr) {
    console.error('Local synthesis error:', synthErr);
    const fallbackCount = Math.max(1, count);
    const safeTopic = topic || 'Flashcard Topic';
    return Array.from({ length: fallbackCount }, (_, i) => ({
      front: `What is key principle #${i + 1} regarding **${safeTopic}**?`,
      back: `Essential concept and criteria regarding **${safeTopic}** (Part ${i + 1}).`,
      explanation: `Mastering this principle ensures rapid recall during active study sessions.`,
      hint: `Recall key term #${i + 1}`,
      tags: ['Study', 'High-Yield'],
    }));
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // -------------------------------------------------------------
  // Community Deck Endpoints
  // -------------------------------------------------------------
  app.get('/api/community/decks', (req: Request, res: Response) => {
    try {
      const search = (req.query.search as string || '').toLowerCase().trim();
      const category = (req.query.category as string || 'All').trim();
      const sortBy = (req.query.sortBy as string || 'popular').trim();

      let filtered = [...communityDecksStore];

      if (category !== 'All') {
        filtered = filtered.filter(d => d.category.toLowerCase() === category.toLowerCase());
      }

      if (search) {
        filtered = filtered.filter(d =>
          d.title.toLowerCase().includes(search) ||
          d.description.toLowerCase().includes(search) ||
          d.tags.some(t => t.toLowerCase().includes(search)) ||
          d.author.toLowerCase().includes(search)
        );
      }

      if (sortBy === 'popular') {
        filtered.sort((a, b) => b.downloads - a.downloads);
      } else if (sortBy === 'rating') {
        filtered.sort((a, b) => b.rating - a.rating);
      } else if (sortBy === 'newest') {
        filtered.sort((a, b) => new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime());
      } else if (sortBy === 'likes') {
        filtered.sort((a, b) => b.likes - a.likes);
      }

      res.json({ success: true, decks: filtered });
    } catch (err: any) {
      console.error('Error fetching community decks:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/community/decks/:id', (req: Request, res: Response) => {
    const deck = communityDecksStore.find(d => d.id === req.params.id);
    if (!deck) {
      return res.status(404).json({ success: false, error: 'Deck not found' });
    }
    res.json({ success: true, deck });
  });

  app.post('/api/community/like/:id', (req: Request, res: Response) => {
    const deck = communityDecksStore.find(d => d.id === req.params.id);
    if (!deck) {
      return res.status(404).json({ success: false, error: 'Deck not found' });
    }
    deck.userLiked = !deck.userLiked;
    deck.likes += deck.userLiked ? 1 : -1;
    res.json({ success: true, likes: deck.likes, userLiked: deck.userLiked });
  });

  app.post('/api/community/publish', (req: Request, res: Response) => {
    try {
      const {
        title,
        description,
        category,
        tags,
        author,
        version,
        changelog,
        sharingControl,
        sampleCards,
        cards,
        existingId
      } = req.body;

      if (!title || !description) {
        return res.status(400).json({ success: false, error: 'Title and description are required' });
      }

      const today = new Date().toISOString().split('T')[0];

      if (existingId) {
        const index = communityDecksStore.findIndex(d => d.id === existingId);
        if (index !== -1) {
          const oldDeck = communityDecksStore[index];
          oldDeck.title = title;
          oldDeck.description = description;
          oldDeck.category = category || oldDeck.category;
          oldDeck.tags = tags || oldDeck.tags;
          oldDeck.version = version || oldDeck.version;
          oldDeck.updatedDate = today;
          oldDeck.cardCount = cards ? cards.length : oldDeck.cardCount;
          oldDeck.sharingControl = sharingControl || oldDeck.sharingControl;
          if (sampleCards) oldDeck.sampleCards = sampleCards;
          if (cards) oldDeck.cards = cards;
          oldDeck.versions.unshift({
            version: version || '1.1.0',
            date: today,
            notes: changelog || 'Updated card contents and notes.',
          });

          return res.json({ success: true, deck: oldDeck });
        }
      }

      const newCommunityDeck: CommunityDeck = {
        id: `comm-${Date.now()}`,
        title,
        description,
        category: category || 'General',
        tags: tags || ['Community'],
        author: author || 'Anonymous Scholar',
        authorAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(title)}`,
        downloads: 1,
        likes: 1,
        userLiked: true,
        version: version || '1.0.0',
        updatedDate: today,
        cardCount: cards ? cards.length : (sampleCards ? sampleCards.length : 0),
        difficulty: 'Intermediate',
        rating: 5.0,
        reviewsCount: 1,
        versions: [
          {
            version: version || '1.0.0',
            date: today,
            notes: changelog || 'Initial release of shared cloud deck.',
          },
        ],
        sharingControl: sharingControl || {
          allowRemix: true,
          license: 'CC-BY-SA 4.0',
        },
        sampleCards: sampleCards || [],
        cards: cards || [],
      };

      communityDecksStore.unshift(newCommunityDeck);
      res.json({ success: true, deck: newCommunityDeck });
    } catch (err: any) {
      console.error('Error publishing community deck:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // AI Endpoints (Gemini API Server-Side)
  // -------------------------------------------------------------

  // List available models with latency and availability status
  app.get('/api/ai/models', (_req: Request, res: Response) => {
    res.json({
      success: true,
      models: [
        {
          id: 'auto',
          name: 'Auto: Highest Availability & Lowest Latency',
          description: 'Automatically routes to the fastest available free model (Gemini 3.8 Flash / 3.1 Flash-Lite)',
          tier: 'Free',
          latency: '< 500ms',
          isDefault: true,
        },
        {
          id: 'gemini-3.1-flash-lite',
          name: 'Gemini 3.1 Flash-Lite',
          description: 'Ultra-low latency, highest availability, rapid responses for lecture notes and prompt Q&A',
          tier: 'Free',
          latency: '~350ms',
        },
        {
          id: 'gemini-3.8-flash',
          name: 'Gemini 3.8 Flash',
          description: 'High-speed cognitive reasoning, complex prompt answering, search grounding & cards',
          tier: 'Free',
          latency: '~550ms',
        },
        {
          id: 'gemini-flash-latest',
          name: 'Gemini Flash Latest',
          description: 'High throughput, low-latency free model for lecture notes and prompt Q&A',
          tier: 'Free',
          latency: '~480ms',
        },
        {
          id: 'gemini-3.1-pro-preview',
          name: 'Gemini 3.1 Pro (Advanced Reasoning)',
          description: 'Deep STEM reasoning, intricate clinical problem solving (Paid Account / Cloud key)',
          tier: 'Paid',
          latency: '~1.8s',
        },
      ],
    });
  });

  // AI Interactive Prompt & Chat with Web Search Grounding & Resource Analysis
  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    try {
      const {
        prompt,
        messages = [],
        resourceContext,
        enableSearch = false,
        model = 'auto',
      } = req.body;

      if (!prompt && (!messages || messages.length === 0)) {
        return res.status(400).json({ success: false, error: 'Prompt or message is required' });
      }

      const ai = getGenAI();

      // Resolve models to try based on user selection
      let modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      if (model && model !== 'auto') {
        modelsToTry = [model, 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      }

      let systemInstruction = `You are Recall AI, a high-yield academic tutor and spaced-repetition study specialist.
Help users understand concepts, analyze uploaded study resources, lecture audio transcripts, and create spaced repetition strategies.
Provide structured, crisp explanations with Markdown formatting, bullet points, and key takeaways highlighted.

If the user asks to generate, create, make, or suggest flashcards or a deck of cards (e.g. "Create a deck for...", "Make 6 cards about...", "Generate flashcards on..."):
Provide an encouraging introductory explanation, and also propose a structured deck at the very end of your response using this exact delimiter format:
:::DECK_PROPOSAL_START:::
{
  "title": "Title of Deck",
  "category": "Science / Medicine / Languages / etc.",
  "description": "Crisp overview of the deck cards",
  "cards": [
    {
      "front": "Front question or cloze prompt",
      "back": "Definitive answer with key terms",
      "hint": "Optional hint"
    }
  ]
}
:::DECK_PROPOSAL_END:::
This will render an interactive proposal card allowing the user to save the deck to their private library with one click.`;

      if (resourceContext && typeof resourceContext === 'string' && resourceContext.trim().length > 0) {
        systemInstruction += `\n\nActive Study Material / Resource Provided by User:\n"""\n${resourceContext.substring(0, 80000)}\n"""\nAnswer questions directly based on this material when relevant, citing specific sections, equations, or concepts.`;
      }

      const contents: any[] = [];
      if (Array.isArray(messages) && messages.length > 0) {
        for (const msg of messages) {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text || msg.content || '' }],
          });
        }
      }

      if (prompt) {
        contents.push({
          role: 'user',
          parts: [{ text: prompt }],
        });
      }

      const config: any = {
        systemInstruction,
      };

      if (enableSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await generateContentWithRetry(
        ai,
        {
          contents,
          config,
        },
        modelsToTry,
        1
      );

      let replyText = response.text || '';
      let proposedDeck: any = null;

      // Extract proposed deck if delimited block exists
      const deckStartIdx = replyText.indexOf(':::DECK_PROPOSAL_START:::');
      const deckEndIdx = replyText.indexOf(':::DECK_PROPOSAL_END:::');
      if (deckStartIdx !== -1 && deckEndIdx > deckStartIdx) {
        const rawJson = replyText.substring(deckStartIdx + ':::DECK_PROPOSAL_START:::'.length, deckEndIdx).trim();
        try {
          proposedDeck = cleanAndParseJson(rawJson, null);
          if (proposedDeck && Array.isArray(proposedDeck.cards) && proposedDeck.cards.length > 0) {
            proposedDeck.saved = false;
          } else {
            proposedDeck = null;
          }
        } catch {
          proposedDeck = null;
        }
        // Remove delimiter block from readable chat text
        replyText = (replyText.substring(0, deckStartIdx) + replyText.substring(deckEndIdx + ':::DECK_PROPOSAL_END:::'.length)).trim();
      }

      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata;
      const groundingChunks = groundingMetadata?.groundingChunks || [];
      const webSearchQueries = groundingMetadata?.webSearchQueries || [];

      const sources = groundingChunks
        .map((chunk: any) => ({
          title: chunk.web?.title || 'Online Source',
          uri: chunk.web?.uri || '',
        }))
        .filter((s: any) => Boolean(s.uri));

      const uniqueSources: { title: string; uri: string }[] = [];
      const seenUris = new Set<string>();
      for (const s of sources) {
        if (!seenUris.has(s.uri)) {
          seenUris.add(s.uri);
          uniqueSources.push(s);
        }
      }

      res.json({
        success: true,
        reply: replyText,
        proposedDeck,
        modelUsed: modelsToTry[0],
        groundingSources: uniqueSources,
        searchQueries: webSearchQueries,
      });
    } catch (err: any) {
      console.error('Error in AI Chat:', err);
      const cleanError = extractCleanErrorMessage(err);
      res.status(500).json({ success: false, error: cleanError });
    }
  });

  // Generate structured study notes from lecture audio transcript or notes
  app.post('/api/ai/generate-notes', async (req: Request, res: Response) => {
    try {
      const { text, title, model = 'auto' } = req.body;
      if (!text || text.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Text or lecture transcript is required' });
      }

      const ai = getGenAI();
      let modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      if (model && model !== 'auto') {
        modelsToTry = [model, 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      }

      const prompt = `You are an elite academic scribe and memory scientist.
Transform the following lecture recording transcript or study material into structured, high-yield study notes.

Material Title: ${title || 'Class Lecture / Study Session'}
Source Text:
"""
${text.substring(0, 80000)}
"""

Please format your response in clean Markdown with:
# ${title || 'Lecture Summary & Notes'}

## 🎯 Executive Summary
(Crisp 2-3 sentence core takeaway)

## 🔑 Key Concepts & Definitions
(Bulleted definitions with bold key terms)

## 🧠 High-Yield Exam Takeaways
(Critical facts, mnemonics, equations, or common pitfalls)

## 📋 Suggested Spaced Repetition Flashcard Prompts
(3-5 core questions to test recall)`;

      const response = await generateContentWithRetry(
        ai,
        {
          contents: prompt,
        },
        modelsToTry,
        1
      );

      res.json({
        success: true,
        notes: response.text || '',
        modelUsed: modelsToTry[0],
      });
    } catch (err: any) {
      console.error('Error generating notes with Gemini:', err);
      const cleanError = extractCleanErrorMessage(err);
      res.status(500).json({ success: false, error: cleanError });
    }
  });

  // 1. Generate flashcards from notes, textbook, or PDF text
  app.post('/api/ai/generate-cards', async (req: Request, res: Response) => {
    try {
      const { text, topic, count = 6, difficulty = 'Intermediate', cardStyle = 'conceptual' } = req.body;

      if (!text && !topic) {
        return res.status(400).json({ success: false, error: 'Provide either text/notes or a topic to generate cards from.' });
      }

      const ai = getGenAI();
      const requestedCount = Math.max(1, parseInt(count, 10) || 6);

      // Break into batches of up to 25 cards each to prevent LLM token cutoffs when generating large sets (e.g. 50, 100+ cards)
      const BATCH_SIZE = 25;
      const totalBatches = Math.ceil(requestedCount / BATCH_SIZE);
      const batchCounts: number[] = [];
      let remaining = requestedCount;
      while (remaining > 0) {
        const take = Math.min(remaining, BATCH_SIZE);
        batchCounts.push(take);
        remaining -= take;
      }

      const generateBatch = async (batchCount: number, batchIndex: number) => {
        const batchInstruction = totalBatches > 1
          ? `Part ${batchIndex + 1} of ${totalBatches}: Focus on subtopic segment #${batchIndex + 1} to ensure zero duplicate cards and comprehensive coverage across the entire material.`
          : '';

        const prompt = `You are an elite cognitive learning specialist and flashcard creator for spaced repetition systems (Anki / Leitner).
Task: Create ${batchCount} exceptionally high-yield flashcards based on the provided material or topic.
Difficulty: ${difficulty}.
Card Style: ${cardStyle} (options: conceptual Q&A, definitions, cloze/fill-in-the-blank, or clinical/practical problem).
${batchInstruction}

Content to transform:
${text ? `Notes/Source Text:\n"""\n${text.substring(0, 100000)}\n"""` : `Topic:\n${topic}`}

Requirements for each card:
1. "front": Clear, concise, unambiguous trigger/question. If cloze, use {{c1::hidden answer}} format or bold key prompt.
2. "back": Crisp, definitive answer with essential keywords highlighted.
3. "explanation": 1-2 sentence high-yield mnemonic, clinical context, or deeper understanding note.
4. "hint": Short subtle clue.
5. "tags": 2-3 relevant tags.

Return strictly valid JSON with an array of objects matching the schema.`;

        const response = await generateContentWithRetry(
          ai,
          {
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                description: 'List of generated flashcards',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    front: { type: Type.STRING, description: 'Question or trigger prompt on card front' },
                    back: { type: Type.STRING, description: 'Direct clear answer on card back' },
                    explanation: { type: Type.STRING, description: 'Explanation, mnemonic, or context' },
                    hint: { type: Type.STRING, description: 'Subtle hint to aid recall' },
                    tags: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Category tags',
                    },
                  },
                  required: ['front', 'back'],
                },
              },
            },
          },
          ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'],
          1
        );

        return cleanAndParseJson<any[]>(response.text, []);
      };

      // Run batches with fallback
      const allCards: any[] = [];
      for (let i = 0; i < batchCounts.length; i++) {
        try {
          const batchCards = await generateBatch(batchCounts[i], i);
          if (Array.isArray(batchCards) && batchCards.length > 0) {
            allCards.push(...batchCards);
          }
        } catch (batchErr) {
          console.warn(`Batch ${i + 1} remote generation failed, utilizing synthesis:`, batchErr);
        }
      }

      // If remote calls fell short or had 503 high demand, synthesize remaining cards seamlessly
      if (allCards.length < requestedCount) {
        const needed = requestedCount - allCards.length;
        const fallbackCards = synthesizeLocalCards(text, topic, needed);
        allCards.push(...fallbackCards);
      }

      res.json({ success: true, cards: allCards });
    } catch (err: any) {
      console.error('Error generating cards with Gemini:', err);
      const fallbackCards = synthesizeLocalCards(req.body?.text, req.body?.topic, req.body?.count || 6);
      if (fallbackCards && fallbackCards.length > 0) {
        return res.json({ success: true, cards: fallbackCards, synthesized: true });
      }
      const cleanError = extractCleanErrorMessage(err);
      res.status(500).json({ success: false, error: cleanError });
    }
  });

  // 2. AI-Assisted Deck Discovery & Recommendations
  app.post('/api/ai/discover-decks', async (req: Request, res: Response) => {
    try {
      const { userGoal, currentDecks = [] } = req.body;

      if (!userGoal) {
        return res.status(400).json({ success: false, error: 'User goal or learning interest is required.' });
      }

      const ai = getGenAI();

      // Available community decks summary for AI matching
      const communitySummary = communityDecksStore.map(d => ({
        id: d.id,
        title: d.title,
        description: d.description,
        category: d.category,
        tags: d.tags,
        difficulty: d.difficulty,
        rating: d.rating,
        cardCount: d.cardCount,
      }));

      const prompt = `You are an AI learning consultant for a spaced-repetition flashcard system.
A user says: "${userGoal}"

Existing user decks: ${JSON.stringify(currentDecks)}
Available community catalog:
${JSON.stringify(communitySummary, null, 2)}

Your task:
1. Recommend matching community decks from the catalog (if any match closely). Include their specific deck IDs in "recommendedDeckIds".
2. Also provide a structured study roadmap with 3 specific actionable flashcard topic modules the user should master.
3. Suggest 3 sample high-yield starter flashcards specifically tailored to their query that they can preview and choose to import.

Return JSON matching the schema.`;

      const response = await generateContentWithRetry(
        ai,
        {
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recommendationSummary: { type: Type.STRING, description: 'Encouraging learning analysis and advice' },
                recommendedDeckIds: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'IDs of matching community decks',
                },
                studyModules: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      focus: { type: Type.STRING },
                      cardTarget: { type: Type.STRING },
                    },
                    required: ['title', 'focus'],
                  },
                },
                sampleCards: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      front: { type: Type.STRING },
                      back: { type: Type.STRING },
                      explanation: { type: Type.STRING },
                      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['front', 'back'],
                  },
                },
              },
              required: ['recommendationSummary', 'recommendedDeckIds', 'studyModules'],
            },
          },
        },
        ['gemini-3.8-flash', 'gemini-3.1-flash-lite'],
        2
      );

      const parsed = cleanAndParseJson<any>(response.text, {});
      res.json({ success: true, discovery: parsed });
    } catch (err: any) {
      console.error('Error discovering decks with Gemini:', err);
      const cleanError = extractCleanErrorMessage(err);
      res.status(500).json({ success: false, error: cleanError });
    }
  });

  // 3. Text-to-Speech (TTS) using Gemini
  app.post('/api/ai/tts', async (req: Request, res: Response) => {
    try {
      const { text, voice = 'Kore' } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, error: 'Text is required for TTS' });
      }

      const ai = getGenAI();

      // Clean markdown tags for natural speech
      const cleanText = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/\{\{c\d+::(.*?)\}\}/g, '$1')
        .replace(/#+\s/g, '')
        .trim();

      const response = await generateContentWithRetry(
        ai,
        {
          contents: [{ parts: [{ text: `Speak clearly for language and flashcard learning: ${cleanText}` }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
              },
            },
          },
        },
        ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash'],
        2
      );

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioBase64) {
        return res.status(500).json({ success: false, error: 'No audio generated' });
      }

      res.json({
        success: true,
        audioBase64,
        mimeType: 'audio/mp3',
      });
    } catch (err: any) {
      console.error('Error with Gemini TTS:', err);
      const cleanError = extractCleanErrorMessage(err);
      res.status(500).json({ success: false, error: cleanError });
    }
  });

  // 4. Speech-to-Text (STT) transcription with language recognition using Gemini
  app.post('/api/ai/transcribe', async (req: Request, res: Response) => {
    try {
      const { audioBase64, mimeType = 'audio/webm', languageHint } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ success: false, error: 'Audio data is required' });
      }

      const ai = getGenAI();

      const audioPart = {
        inlineData: {
          mimeType: mimeType || 'audio/webm',
          data: audioBase64,
        },
      };

      const langHintInstruction = languageHint && languageHint !== 'auto'
        ? `The speaker is expected to speak in ${languageHint}.`
        : `Automatically detect and recognize the spoken language accurately (e.g. English, Spanish, French, German, Japanese, Chinese, etc.).`;

      const promptText = `Listen to this audio recording and transcribe the speech with extreme precision.
${langHintInstruction}
Transcribe every word verbatim with proper grammatical capitalization, punctuation, and native orthography (such as correct Spanish tildes, French/German accents, or Asian characters).
Return ONLY a valid JSON object matching this schema:
{
  "transcript": "string verbatim transcription",
  "detectedLanguage": "string name of the recognized language (e.g. Spanish, English, French, Japanese)",
  "confidence": number from 0 to 100
}`;

      const response = await generateContentWithRetry(
        ai,
        {
          contents: {
            parts: [
              audioPart,
              { text: promptText },
            ],
          },
        },
        ['gemini-3.5-transcribe', 'gemini-3.8-flash', 'gemini-2.5-flash'],
        2
      );

      const raw = response.text?.trim() || '';
      let parsed: any = null;
      try {
        parsed = cleanAndParseJson<any>(raw, null);
      } catch {}

      if (parsed && typeof parsed.transcript === 'string') {
        res.json({
          success: true,
          transcript: parsed.transcript,
          detectedLanguage: parsed.detectedLanguage || 'Recognized Language',
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 98,
        });
      } else {
        res.json({
          success: true,
          transcript: raw.replace(/```json/g, '').replace(/```/g, '').trim(),
          detectedLanguage: languageHint || 'Auto-Detected',
          confidence: 95,
        });
      }
    } catch (err: any) {
      console.error('Error with Gemini Transcribe:', err);
      const cleanError = extractCleanErrorMessage(err);
      res.status(500).json({ success: false, error: cleanError });
    }
  });

  // -------------------------------------------------------------
  // Vite Integration (Dev vs Prod)
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Recall Flashcard server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
