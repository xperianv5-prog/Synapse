import React, { useState } from 'react';
import {
  X, Sparkles, UploadCloud, FileText, Check, AlertCircle,
  Loader2, CheckSquare, Square, Edit3, ArrowRight, RotateCw
} from 'lucide-react';
import { Flashcard } from '../types';
import { extractTextFromPdf } from '../utils/pdf';
import { Skin } from '../utils/skins';

interface AiCardGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDeckId: string;
  targetDeckTitle: string;
  onCardsApproved: (newCards: Partial<Flashcard>[]) => void;
  activeSkin?: Skin;
}

interface GeneratedDraftCard {
  id: string;
  front: string;
  back: string;
  explanation?: string;
  hint?: string;
  tags: string[];
  selected: boolean;
  isEditing?: boolean;
}

export function AiCardGeneratorModal({
  isOpen,
  onClose,
  targetDeckId,
  targetDeckTitle,
  onCardsApproved,
  activeSkin,
}: AiCardGeneratorModalProps) {
  const [sourceType, setSourceType] = useState<'pdf' | 'notes' | 'topic'>('pdf');
  const [inputText, setInputText] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [cardCount, setCardCount] = useState(6);
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [cardStyle, setCardStyle] = useState('conceptual');

  // File states
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);

  // Generation & Approval states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftCards, setDraftCards] = useState<GeneratedDraftCard[]>([]);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsExtractingPdf(true);
    setError(null);

    try {
      const extracted = await extractTextFromPdf(file);
      setInputText(extracted);
      setSourceType('pdf');
    } catch (err: any) {
      console.error('PDF extraction failed:', err);
      setError(err.message || 'Failed to extract text from PDF. Try pasting text directly.');
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const handleGenerate = async () => {
    setError(null);
    if (sourceType !== 'topic' && !inputText.trim()) {
      setError('Please upload a PDF or paste notes to generate cards.');
      return;
    }
    if (sourceType === 'topic' && !topicInput.trim()) {
      setError('Please enter a study topic.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceType !== 'topic' ? inputText : undefined,
          topic: sourceType === 'topic' ? topicInput : undefined,
          count: cardCount,
          difficulty,
          cardStyle,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate flashcards.');
      }

      const generated: GeneratedDraftCard[] = (data.cards || []).map((c: any, index: number) => ({
        id: `draft-${Date.now()}-${index}`,
        front: c.front || '',
        back: c.back || '',
        explanation: c.explanation || '',
        hint: c.hint || '',
        tags: Array.isArray(c.tags) ? c.tags : ['AI-Generated'],
        selected: true,
      }));

      setDraftCards(generated);
      setStep('preview');
    } catch (err: any) {
      console.error('Error generating cards:', err);
      let message = err.message || 'Generation failed. Please try again.';
      try {
        if (message.includes('{') && message.includes('}')) {
          const jsonStart = message.indexOf('{');
          const jsonEnd = message.lastIndexOf('}');
          const parsed = JSON.parse(message.substring(jsonStart, jsonEnd + 1));
          if (parsed?.error?.message) {
            message = parsed.error.message;
          }
        }
      } catch {}
      if (
        message.includes('503') ||
        message.includes('high demand') ||
        message.includes('UNAVAILABLE') ||
        message.includes('spikes in demand')
      ) {
        message = 'The AI service is experiencing temporary high demand. Please try again in a few moments.';
      }
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMore = async (moreCount: number) => {
    setIsGeneratingMore(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/generate-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceType !== 'topic' ? inputText : undefined,
          topic: sourceType === 'topic' ? topicInput : undefined,
          count: moreCount,
          difficulty,
          cardStyle,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate additional flashcards.');
      }

      const generated: GeneratedDraftCard[] = (data.cards || []).map((c: any, index: number) => ({
        id: `draft-${Date.now()}-${draftCards.length + index}`,
        front: c.front || '',
        back: c.back || '',
        explanation: c.explanation || '',
        hint: c.hint || '',
        tags: Array.isArray(c.tags) ? c.tags : ['AI-Generated'],
        selected: true,
      }));

      setDraftCards(prev => [...prev, ...generated]);
    } catch (err: any) {
      console.error('Error generating more cards:', err);
      setError(err.message || 'Failed to generate more cards.');
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const toggleSelectCard = (id: string) => {
    setDraftCards(cards =>
      cards.map(c => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const toggleSelectAll = (select: boolean) => {
    setDraftCards(cards => cards.map(c => ({ ...c, selected: select })));
  };

  const updateDraftCardText = (id: string, front: string, back: string) => {
    setDraftCards(cards =>
      cards.map(c => (c.id === id ? { ...c, front, back, isEditing: false } : c))
    );
  };

  const handleConfirmImport = () => {
    const selected = draftCards.filter(c => c.selected);
    if (selected.length === 0) return;

    const formatted: Partial<Flashcard>[] = selected.map(c => ({
      deckId: targetDeckId,
      front: { text: c.front },
      back: { text: c.back, explanation: c.explanation },
      hint: c.hint,
      tags: c.tags,
    }));

    onCardsApproved(formatted);
    onClose();
  };

  const selectedCount = draftCards.filter(c => c.selected).length;

  const surfaceBg = activeSkin?.colors.surface || '#0f172a';
  const surfaceHover = activeSkin?.colors.surfaceHover || '#1e293b';
  const borderColor = activeSkin?.colors.border || '#1e293b';
  const textPrimary = activeSkin?.colors.textPrimary || '#f8fafc';
  const textSecondary = activeSkin?.colors.textSecondary || '#94a3b8';
  const textMuted = activeSkin?.colors.textMuted || '#64748b';
  const accentColor = activeSkin?.colors.accent || '#6366f1';
  const accentText = activeSkin?.colors.accentText || '#ffffff';
  const accentGlow = activeSkin?.colors.accentGlow || 'rgba(99, 102, 241, 0.4)';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      <div
        className="w-full max-w-2xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl border animate-in slide-in-from-bottom duration-200 transition-colors"
        style={{
          backgroundColor: surfaceBg,
          borderColor: borderColor,
          color: textPrimary,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: borderColor }}
        >
          <div>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: textPrimary }}>
              <Sparkles className="w-4 h-4" style={{ color: accentColor }} />
              AI Flashcard Studio
            </h2>
            <p className="text-xs" style={{ color: textSecondary }}>
              Generating cards for: <span className="font-semibold" style={{ color: accentColor }}>{targetDeckTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:opacity-80 transition-colors"
            style={{ color: textSecondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-5 mt-3 p-3 bg-rose-950/60 border border-rose-800/70 rounded-2xl text-xs text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">{error}</p>
                <p className="text-[11px] text-rose-300/80 mt-0.5">
                  Spikes in demand are usually temporary. You can retry immediately with automatic model fallback.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shrink-0 transition-all active:scale-95"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCw className="w-3.5 h-3.5" />
              )}
              <span>Retry Now</span>
            </button>
          </div>
        )}

        {/* STEP 1: Input & Configuration */}
        {step === 'input' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            
            {/* Input Mode Tabs */}
            <div
              className="flex rounded-2xl p-1 border"
              style={{
                backgroundColor: surfaceBg,
                borderColor: borderColor,
              }}
            >
              <button
                type="button"
                onClick={() => setSourceType('pdf')}
                className="flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: sourceType === 'pdf' ? accentColor : 'transparent',
                  color: sourceType === 'pdf' ? accentText : textSecondary,
                  boxShadow: sourceType === 'pdf' ? `0 2px 8px ${accentGlow}` : undefined,
                }}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceType('notes')}
                className="flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: sourceType === 'notes' ? accentColor : 'transparent',
                  color: sourceType === 'notes' ? accentText : textSecondary,
                  boxShadow: sourceType === 'notes' ? `0 2px 8px ${accentGlow}` : undefined,
                }}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Notes</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceType('topic')}
                className="flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: sourceType === 'topic' ? accentColor : 'transparent',
                  color: sourceType === 'topic' ? accentText : textSecondary,
                  boxShadow: sourceType === 'topic' ? `0 2px 8px ${accentGlow}` : undefined,
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>By Topic</span>
              </button>
            </div>

            {/* Upload PDF Section */}
            {sourceType === 'pdf' && (
              <div className="space-y-2">
                <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-950/40 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group">
                  <UploadCloud className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform mb-2" />
                  <span className="text-sm font-semibold text-slate-200">
                    {uploadedFileName ? uploadedFileName : 'Choose PDF, Text, or Markdown file'}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    Drag & drop or click to upload lecture slides, papers, or study guides
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {isExtractingPdf && (
                  <div className="flex items-center justify-center gap-2 text-xs text-indigo-400 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting high-yield text from PDF...</span>
                  </div>
                )}

                {inputText && (
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 font-medium">Extracted Source Preview:</span>
                    <textarea
                      rows={4}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Paste Notes Section */}
            {sourceType === 'notes' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Paste Study Notes or Textbook Excerpt
                </label>
                <textarea
                  rows={6}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste lecture notes, definitions, articles, or transcripts here..."
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            )}

            {/* Topic Input Section */}
            {sourceType === 'topic' && (
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Target Topic & Learning Objective
                  </label>
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="e.g. Cranial nerves origins and sensory/motor functions"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Quick Topic Presets */}
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-400">Quick High-Yield Topic Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Cranial Nerves & Neuroanatomy',
                      'USMLE High-Yield Pharmacology',
                      'JavaScript Async/Await & Event Loop',
                      'Organic Chemistry Reactions',
                      'Spanish Verbs & Conversational Phrases',
                      'World History & Key Milestones',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setTopicInput(preset);
                          setSourceType('topic');
                        }}
                        className="px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all active:scale-95 text-left"
                        style={{
                          backgroundColor: topicInput === preset ? accentColor : surfaceHover,
                          borderColor: topicInput === preset ? accentColor : borderColor,
                          color: topicInput === preset ? accentText : textSecondary,
                        }}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tuning Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Card Style</label>
                <select
                  value={cardStyle}
                  onChange={(e) => setCardStyle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="conceptual">Conceptual Q&A</option>
                  <option value="definition">Terms & Definitions</option>
                  <option value="cloze">Cloze (Fill-in-blank)</option>
                  <option value="clinical">Case & Problem</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced (USMLE/Pro)</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold" style={{ color: textSecondary }}>
                    Cards to Generate (Limitless & User-Defined)
                  </label>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: `${accentColor}18`,
                      borderColor: `${accentColor}35`,
                      color: accentColor,
                    }}
                  >
                    Limitless
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={cardCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setCardCount(isNaN(val) ? 1 : Math.max(1, val));
                      }}
                      className="w-full border rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none"
                      style={{
                        backgroundColor: surfaceHover,
                        borderColor: borderColor,
                        color: textPrimary,
                      }}
                      placeholder="Enter any number (e.g. 15, 30, 50, 100)"
                    />
                    <span className="absolute right-3 top-2 text-xs font-semibold opacity-60">cards</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[5, 10, 20, 35, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCardCount(preset)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95"
                        style={{
                          backgroundColor: cardCount === preset ? accentColor : surfaceHover,
                          borderColor: cardCount === preset ? accentColor : borderColor,
                          color: cardCount === preset ? accentText : textSecondary,
                          boxShadow: cardCount === preset ? `0 2px 8px ${accentGlow}` : undefined,
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px]" style={{ color: textMuted }}>
                  Define any quantity of flashcards. Large batches are automatically synthesized without limits.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Explicit Preview & Approval Checklist */}
        {step === 'preview' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-200">
                  Review & Approve Generated Cards ({draftCards.length})
                </span>
                <p className="text-[11px] text-slate-400">
                  Explicit preview required before adding cards to your deck.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleSelectAll(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Select All
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => toggleSelectAll(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 font-medium"
                >
                  Deselect
                </button>
              </div>
            </div>

            {/* Limitless Extension Bar: Generate More Cards to Draft */}
            <div
              className="p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2.5"
              style={{
                backgroundColor: surfaceBg,
                borderColor: borderColor,
              }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: accentColor }} />
                <div>
                  <span className="text-xs font-bold block" style={{ color: textPrimary }}>
                    Generate More Flashcards (Compound Limitless Deck)
                  </span>
                  <span className="text-[10px]" style={{ color: textMuted }}>
                    Synthesize additional cards without losing currently drafted cards
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {[5, 10, 20].map((count) => (
                  <button
                    key={count}
                    type="button"
                    disabled={isGeneratingMore}
                    onClick={() => handleGenerateMore(count)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl border transition-all active:scale-95 disabled:opacity-40"
                    style={{
                      backgroundColor: surfaceHover,
                      borderColor: borderColor,
                      color: textPrimary,
                    }}
                  >
                    +{count} More
                  </button>
                ))}
                {isGeneratingMore && (
                  <div className="flex items-center gap-1.5 text-xs px-2" style={{ color: accentColor }}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Adding...</span>
                  </div>
                )}
              </div>
            </div>

            {/* List of Draft Cards */}
            <div className="space-y-3">
              {draftCards.map((card) => (
                <div
                  key={card.id}
                  className={`border rounded-2xl p-4 transition-all ${
                    card.selected
                      ? 'bg-slate-800/80 border-indigo-500/50 shadow-md'
                      : 'bg-slate-900/40 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSelectCard(card.id)}
                      className="mt-0.5 text-indigo-400 hover:text-indigo-300 shrink-0"
                    >
                      {card.selected ? (
                        <CheckSquare className="w-5 h-5 text-indigo-500 fill-indigo-500/20" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Question / Prompt
                        </span>
                        <p className="text-sm font-semibold text-slate-100 whitespace-pre-line">
                          {card.front}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-700/60">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">
                          Answer
                        </span>
                        <p className="text-xs text-slate-200 whitespace-pre-line">
                          {card.back}
                        </p>
                      </div>

                      {card.explanation && (
                        <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2 rounded-lg">
                          <span className="text-indigo-300 font-medium">Insight: </span>
                          {card.explanation}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 pt-1">
                        {card.tags.map(t => (
                          <span key={t} className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div
          className="px-5 py-3.5 border-t flex items-center justify-between shrink-0"
          style={{
            backgroundColor: surfaceBg,
            borderColor: borderColor,
          }}
        >
          {step === 'preview' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-4 py-2 text-xs font-semibold rounded-xl hover:opacity-80 transition-all"
                style={{ color: textSecondary }}
              >
                Back to Config
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={selectedCount === 0}
                className="px-5 py-2 disabled:opacity-40 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg transition-all active:scale-95"
                style={{
                  backgroundColor: accentColor,
                  color: accentText,
                  boxShadow: `0 4px 14px ${accentGlow}`,
                }}
              >
                <Check className="w-4 h-4" />
                <span>Import {selectedCount} Approved Cards</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl hover:opacity-80 transition-all"
                style={{ color: textSecondary }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || isExtractingPdf}
                className="px-5 py-2 disabled:opacity-50 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg transition-all active:scale-95"
                style={{
                  backgroundColor: accentColor,
                  color: accentText,
                  boxShadow: `0 4px 14px ${accentGlow}`,
                }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing & Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate {cardCount} Cards & Preview</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
