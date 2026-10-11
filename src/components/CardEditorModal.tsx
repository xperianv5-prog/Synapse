import React, { useState } from 'react';
import { X, Check, Image as ImageIcon, Volume2, Mic, PenTool, Sparkles, Tag, HelpCircle, FileText } from 'lucide-react';
import { Flashcard, CardMedia } from '../types';
import { AudioRecorderWidget } from './AudioRecorderWidget';
import { AudioPlayerWave } from './AudioPlayerWave';
import { SketchCanvasModal } from './SketchCanvasModal';
import { speakText } from '../utils/audio';
import { SpeechToTextControl } from './SpeechToTextControl';
import { Skin } from '../utils/skins';
import { getCardFrontText, getCardBackText, getCardExplanation } from '../utils/cardHelpers';

interface CardEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardData: Partial<Flashcard>) => void;
  onSaveBatch?: (cardsData: Partial<Flashcard>[]) => void;
  initialCard?: Flashcard | null;
  deckId: string;
  activeSkin?: Skin;
}

export function CardEditorModal({
  isOpen,
  onClose,
  onSave,
  onSaveBatch,
  initialCard,
  deckId,
  activeSkin,
}: CardEditorModalProps) {
  const [editorMode, setEditorMode] = useState<'single' | 'batch'>('single');
  const [frontText, setFrontText] = useState(getCardFrontText(initialCard));
  const [backText, setBackText] = useState(getCardBackText(initialCard));
  const [explanation, setExplanation] = useState(getCardExplanation(initialCard));
  const [hint, setHint] = useState(initialCard?.hint || '');
  const [tags, setTags] = useState<string[]>(initialCard?.tags || []);
  const [tagInput, setTagInput] = useState('');

  // Batch paste mode state
  const [batchText, setBatchText] = useState('');
  const [batchDelimiter, setBatchDelimiter] = useState<'pipe' | 'tab' | 'dash'>('pipe');

  // Multimedia states
  const [frontMedia, setFrontMedia] = useState<CardMedia>(initialCard?.front?.media || {});
  const [activeMediaTab, setActiveMediaTab] = useState<'none' | 'image' | 'audio' | 'sketch'>('none');
  const [imageUrlInput, setImageUrlInput] = useState(initialCard?.front?.media?.imageUrl || '');
  const [isSketchOpen, setIsSketchOpen] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setFrontText(getCardFrontText(initialCard));
      setBackText(getCardBackText(initialCard));
      setExplanation(getCardExplanation(initialCard));
      setHint(initialCard?.hint || '');
      setTags(initialCard?.tags || []);
      setFrontMedia(initialCard?.front?.media || {});
      setImageUrlInput(initialCard?.front?.media?.imageUrl || '');
      setActiveMediaTab('none');
      setTagInput('');
    }
  }, [isOpen, initialCard]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tToRemove: string) => {
    setTags(tags.filter(t => t !== tToRemove));
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const result = loadEvt.target?.result as string;
      setFrontMedia(prev => ({ ...prev, imageUrl: result }));
      setActiveMediaTab('none');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveImageUrl = () => {
    if (imageUrlInput.trim()) {
      setFrontMedia(prev => ({ ...prev, imageUrl: imageUrlInput.trim() }));
      setActiveMediaTab('none');
    }
  };

  const handleSaveSketch = (sketchDataUrl: string) => {
    setFrontMedia(prev => ({ ...prev, imageUrl: sketchDataUrl }));
  };

  const handleAudioRecorded = (rec: { base64Data: string; duration: number }) => {
    setFrontMedia(prev => ({
      ...prev,
      audioData: rec.base64Data,
      audioDuration: rec.duration,
    }));
    setActiveMediaTab('none');
  };

  const handlePlayTts = async (text: string, label: string) => {
    setTtsPlaying(label);
    try {
      await speakText(text);
    } finally {
      setTtsPlaying(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontText.trim() || !backText.trim()) return;

    onSave({
      deckId,
      front: {
        text: frontText.trim(),
        media: frontMedia.imageUrl || frontMedia.audioData ? frontMedia : undefined,
      },
      back: {
        text: backText.trim(),
        explanation: explanation.trim() || undefined,
      },
      hint: hint.trim() || undefined,
      tags,
    });
    onClose();
  };

  const handleSaveAndAddAnother = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontText.trim() || !backText.trim()) return;

    onSave({
      deckId,
      front: {
        text: frontText.trim(),
        media: frontMedia.imageUrl || frontMedia.audioData ? frontMedia : undefined,
      },
      back: {
        text: backText.trim(),
        explanation: explanation.trim() || undefined,
      },
      hint: hint.trim() || undefined,
      tags,
    });

    // Reset fields for the next card immediately without closing
    setFrontText('');
    setBackText('');
    setExplanation('');
    setHint('');
    setFrontMedia({});
    setImageUrlInput('');
  };

  const parsedBatchCards = React.useMemo(() => {
    if (!batchText.trim()) return [];
    const lines = batchText.split('\n');
    const result: Partial<Flashcard>[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let front = '';
      let back = '';

      if (batchDelimiter === 'pipe') {
        const parts = trimmed.split('|');
        if (parts.length >= 2) {
          front = parts[0].trim();
          back = parts.slice(1).join('|').trim();
        }
      } else if (batchDelimiter === 'tab') {
        const parts = trimmed.split('\t');
        if (parts.length >= 2) {
          front = parts[0].trim();
          back = parts.slice(1).join('\t').trim();
        }
      } else if (batchDelimiter === 'dash') {
        const parts = trimmed.split(' - ');
        if (parts.length >= 2) {
          front = parts[0].trim();
          back = parts.slice(1).join(' - ').trim();
        }
      }

      if (front && back) {
        result.push({
          deckId,
          front: { text: front },
          back: { text: back },
          tags,
        });
      }
    });

    return result;
  }, [batchText, batchDelimiter, deckId, tags]);

  const handleSaveBatch = () => {
    if (parsedBatchCards.length === 0) return;
    if (onSaveBatch) {
      onSaveBatch(parsedBatchCards);
    } else {
      parsedBatchCards.forEach(c => onSave(c));
    }
    onClose();
  };

  const surfaceBg = activeSkin?.colors.surface || '#0f172a';
  const surfaceHover = activeSkin?.colors.surfaceHover || '#1e293b';
  const borderColor = activeSkin?.colors.border || '#1e293b';
  const textPrimary = activeSkin?.colors.textPrimary || '#f8fafc';
  const textSecondary = activeSkin?.colors.textSecondary || '#94a3b8';
  const textMuted = activeSkin?.colors.textMuted || '#64748b';
  const accentColor = activeSkin?.colors.accent || '#6366f1';
  const accentText = activeSkin?.colors.accentText || '#ffffff';
  const accentGlow = activeSkin?.colors.accentGlow || 'rgba(99, 102, 241, 0.4)';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      <div
        className="w-full max-w-xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl border animate-in slide-in-from-bottom duration-200 transition-colors"
        style={{
          backgroundColor: surfaceBg,
          borderColor: borderColor,
          color: textPrimary,
        }}
      >
        {/* Top App Bar Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: borderColor }}
        >
          <div>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: textPrimary }}>
              <Sparkles className="w-4 h-4" style={{ color: accentColor }} />
              {initialCard ? 'Edit Flashcard' : 'Create New Flashcard'}
            </h2>
            <p className="text-xs" style={{ color: textSecondary }}>
              Multimedia-enabled with audio, images, and dictation
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

        {/* Creation Mode Switch (Single Card vs Batch Quick-Paste) */}
        {!initialCard && (
          <div
            className="flex border-b px-5 text-xs font-semibold shrink-0"
            style={{ borderColor, backgroundColor: surfaceHover }}
          >
            <button
              type="button"
              onClick={() => setEditorMode('single')}
              className="py-2.5 px-3 border-b-2 transition-all"
              style={{
                borderColor: editorMode === 'single' ? accentColor : 'transparent',
                color: editorMode === 'single' ? accentColor : textSecondary,
                fontWeight: editorMode === 'single' ? 700 : 500,
              }}
            >
              Single Card
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('batch')}
              className="py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5"
              style={{
                borderColor: editorMode === 'batch' ? accentColor : 'transparent',
                color: editorMode === 'batch' ? accentColor : textSecondary,
                fontWeight: editorMode === 'batch' ? 700 : 500,
              }}
            >
              <span>Batch Quick-Paste (Limitless)</span>
              {parsedBatchCards.length > 0 && (
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: accentColor, color: accentText }}
                >
                  {parsedBatchCards.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Scrollable Form Body */}
        {editorMode === 'batch' && !initialCard ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold block" style={{ color: textPrimary }}>
                Fast Bulk Card Creator
              </span>
              <p className="text-[11px]" style={{ color: textSecondary }}>
                Paste or type any limitless number of cards. Each line represents one card.
              </p>
            </div>

            {/* Delimiter selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-[11px]" style={{ color: textSecondary }}>Format:</span>
              <div className="flex items-center gap-1 border rounded-xl p-0.5" style={{ borderColor, backgroundColor: surfaceHover }}>
                <button
                  type="button"
                  onClick={() => setBatchDelimiter('pipe')}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                  style={{
                    backgroundColor: batchDelimiter === 'pipe' ? accentColor : 'transparent',
                    color: batchDelimiter === 'pipe' ? accentText : textSecondary,
                  }}
                >
                  Question | Answer
                </button>
                <button
                  type="button"
                  onClick={() => setBatchDelimiter('tab')}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                  style={{
                    backgroundColor: batchDelimiter === 'tab' ? accentColor : 'transparent',
                    color: batchDelimiter === 'tab' ? accentText : textSecondary,
                  }}
                >
                  TSV (Tab-separated)
                </button>
                <button
                  type="button"
                  onClick={() => setBatchDelimiter('dash')}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                  style={{
                    backgroundColor: batchDelimiter === 'dash' ? accentColor : 'transparent',
                    color: batchDelimiter === 'dash' ? accentText : textSecondary,
                  }}
                >
                  Question - Answer
                </button>
              </div>
            </div>

            {/* Large Text Area */}
            <textarea
              rows={9}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={
                batchDelimiter === 'pipe'
                  ? 'What is the powerhouse of the cell? | Mitochondria\nWhat is the capital of France? | Paris\nFirst cranial nerve? | Olfactory nerve'
                  : batchDelimiter === 'dash'
                  ? 'What is the powerhouse of the cell? - Mitochondria\nWhat is the capital of France? - Paris'
                  : 'Question\tAnswer'
              }
              className="w-full border rounded-2xl p-3.5 text-xs focus:outline-none resize-none font-mono transition-colors"
              style={{
                backgroundColor: surfaceHover,
                borderColor,
                color: textPrimary,
              }}
            />

            {/* Live Parsing Preview Counter */}
            <div
              className="p-3 rounded-2xl border flex items-center justify-between"
              style={{
                backgroundColor: `${surfaceBg}80`,
                borderColor,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: textPrimary }}>
                  {parsedBatchCards.length} {parsedBatchCards.length === 1 ? 'flashcard' : 'flashcards'} parsed
                </span>
                <span className="text-[10px] opacity-70">
                  ({batchText.split('\n').filter(l => l.trim()).length} total lines)
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                Limitless user capacity
              </span>
            </div>
          </div>
        ) : (
          <form id="card-editor-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Front / Question Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: textSecondary }}>
                <span>Front (Question / Prompt)</span>
                <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <SpeechToTextControl
                  label="Dictate"
                  onTranscript={(transcript) => {
                    setFrontText(prev => prev ? `${prev} ${transcript}` : transcript);
                  }}
                />
                {frontText && (
                  <button
                    type="button"
                    onClick={() => handlePlayTts(frontText, 'front')}
                    disabled={ttsPlaying === 'front'}
                    className="p-1.5 rounded-lg text-xs flex items-center gap-1 border transition-all"
                    style={{
                      backgroundColor: surfaceHover,
                      borderColor: borderColor,
                      color: textPrimary,
                    }}
                    title="Pronounce with Text-to-Speech"
                  >
                    <Volume2 className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    <span>{ttsPlaying === 'front' ? 'Speaking...' : 'TTS'}</span>
                  </button>
                )}
              </div>
            </div>
            <textarea
              required
              rows={3}
              value={frontText}
              onChange={(e) => setFrontText(e.target.value)}
              placeholder="e.g. What is the mechanism of action of Heparin?"
              className="w-full border rounded-2xl p-3 text-sm focus:outline-none transition-all resize-none"
              style={{
                backgroundColor: surfaceHover,
                borderColor: borderColor,
                color: textPrimary,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = accentColor;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${accentGlow}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = borderColor;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Multimedia Attachment Section */}
          <div
            className="border rounded-2xl p-3.5 space-y-3"
            style={{
              backgroundColor: `${surfaceHover}80`,
              borderColor: borderColor,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: textSecondary }}>
                <ImageIcon className="w-3.5 h-3.5" style={{ color: accentColor }} />
                Multimedia Attachments
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveMediaTab(activeMediaTab === 'image' ? 'none' : 'image')}
                  className="px-2.5 py-1 text-xs rounded-xl flex items-center gap-1 transition-all border"
                  style={{
                    backgroundColor: activeMediaTab === 'image' ? accentColor : surfaceHover,
                    color: activeMediaTab === 'image' ? accentText : textSecondary,
                    borderColor: activeMediaTab === 'image' ? accentColor : borderColor,
                  }}
                >
                  <ImageIcon className="w-3 h-3" />
                  Image
                </button>
                <button
                  type="button"
                  onClick={() => setIsSketchOpen(true)}
                  className="px-2.5 py-1 text-xs rounded-xl flex items-center gap-1 border transition-all"
                  style={{
                    backgroundColor: surfaceHover,
                    borderColor: borderColor,
                    color: textSecondary,
                  }}
                >
                  <PenTool className="w-3 h-3" />
                  Sketch
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMediaTab(activeMediaTab === 'audio' ? 'none' : 'audio')}
                  className="px-2.5 py-1 text-xs rounded-xl flex items-center gap-1 transition-all border"
                  style={{
                    backgroundColor: activeMediaTab === 'audio' ? accentColor : surfaceHover,
                    color: activeMediaTab === 'audio' ? accentText : textSecondary,
                    borderColor: activeMediaTab === 'audio' ? accentColor : borderColor,
                  }}
                >
                  <Mic className="w-3 h-3" />
                  Audio
                </button>
              </div>
            </div>

            {/* Render current attached image preview */}
            {frontMedia.imageUrl && (
              <div className="relative rounded-xl overflow-hidden border max-h-48 group" style={{ borderColor: borderColor }}>
                <img
                  src={frontMedia.imageUrl}
                  alt="Card visual"
                  className="w-full h-auto object-cover max-h-48"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={() => setFrontMedia(prev => ({ ...prev, imageUrl: undefined }))}
                  className="absolute top-2 right-2 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-md"
                  title="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Render current attached audio preview */}
            {frontMedia.audioData && (
              <div className="space-y-1">
                <AudioPlayerWave
                  audioData={frontMedia.audioData}
                  duration={frontMedia.audioDuration}
                  title="Card voice clip"
                />
              </div>
            )}

            {/* Image input panel */}
            {activeMediaTab === 'image' && (
              <div
                className="p-3 border rounded-xl space-y-2 text-xs"
                style={{
                  backgroundColor: surfaceBg,
                  borderColor: borderColor,
                }}
              >
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Paste image URL (https://...)"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="flex-1 border rounded-xl px-2.5 py-1.5 focus:outline-none"
                    style={{
                      backgroundColor: surfaceHover,
                      borderColor: borderColor,
                      color: textPrimary,
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveImageUrl}
                    className="px-3 py-1.5 font-bold rounded-xl shadow transition-all"
                    style={{
                      backgroundColor: accentColor,
                      color: accentText,
                    }}
                  >
                    Add
                  </button>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: borderColor }}>
                  <label
                    className="flex-1 py-1.5 px-3 rounded-xl cursor-pointer text-center font-medium border transition-all"
                    style={{
                      backgroundColor: surfaceHover,
                      borderColor: borderColor,
                      color: textSecondary,
                    }}
                  >
                    Upload from device
                    <input type="file" accept="image/*" onChange={handleImageFileUpload} className="hidden" />
                  </label>
                </div>
              </div>
            )}

            {/* Audio recorder panel */}
            {activeMediaTab === 'audio' && (
              <AudioRecorderWidget
                onAudioRecorded={handleAudioRecorded}
                existingAudioData={frontMedia.audioData}
                onDeleteExisting={() => setFrontMedia(prev => ({ ...prev, audioData: undefined }))}
              />
            )}
          </div>

          {/* Back / Answer Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: textSecondary }}>
                <span>Back (Answer)</span>
                <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <SpeechToTextControl
                  label="Dictate"
                  onTranscript={(transcript) => {
                    setBackText(prev => prev ? `${prev} ${transcript}` : transcript);
                  }}
                />
                {backText && (
                  <button
                    type="button"
                    onClick={() => handlePlayTts(backText, 'back')}
                    disabled={ttsPlaying === 'back'}
                    className="p-1.5 rounded-lg text-xs flex items-center gap-1 border transition-all"
                    style={{
                      backgroundColor: surfaceHover,
                      borderColor: borderColor,
                      color: textPrimary,
                    }}
                  >
                    <Volume2 className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    <span>{ttsPlaying === 'back' ? 'Speaking...' : 'TTS'}</span>
                  </button>
                )}
              </div>
            </div>
            <textarea
              required
              rows={3}
              value={backText}
              onChange={(e) => setBackText(e.target.value)}
              placeholder="e.g. Potentiates Antithrombin III, inactivating Thrombin and Factor Xa."
              className="w-full border rounded-2xl p-3 text-sm focus:outline-none transition-all resize-none"
              style={{
                backgroundColor: surfaceHover,
                borderColor: borderColor,
                color: textPrimary,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = accentColor;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${accentGlow}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = borderColor;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Explanation / Mnemonic */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: textSecondary }}>
              <FileText className="w-3.5 h-3.5" style={{ color: textMuted }} />
              <span>Explanation / Mnemonic (Optional)</span>
            </label>
            <input
              type="text"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="e.g. Antidote is Protamine Sulfate."
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors"
              style={{
                backgroundColor: surfaceHover,
                borderColor: borderColor,
                color: textPrimary,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = accentColor;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${accentGlow}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = borderColor;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Hint */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: textSecondary }}>
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Hint (Shown on demand)</span>
            </label>
            <input
              type="text"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g. Involves cofactor Antithrombin..."
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors"
              style={{
                backgroundColor: surfaceHover,
                borderColor: borderColor,
                color: textPrimary,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = accentColor;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${accentGlow}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = borderColor;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: textSecondary }}>
              <Tag className="w-3.5 h-3.5" style={{ color: textMuted }} />
              <span>Tags</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1 border"
                  style={{
                    backgroundColor: `${accentColor}18`,
                    borderColor: `${accentColor}35`,
                    color: accentColor,
                  }}
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-rose-400 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add tag (e.g. Pharmacology, High-Yield)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 border rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-colors"
                style={{
                  backgroundColor: surfaceHover,
                  borderColor: borderColor,
                  color: textPrimary,
                }}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all"
                style={{
                  backgroundColor: surfaceHover,
                  borderColor: borderColor,
                  color: textPrimary,
                }}
              >
                Add Tag
              </button>
            </div>
          </div>
        </form>
        )}

        {/* Bottom Save / Cancel Bar */}
        <div
          className="px-5 py-3.5 border-t flex items-center justify-between gap-2.5 shrink-0"
          style={{
            backgroundColor: surfaceBg,
            borderColor: borderColor,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl transition-all hover:opacity-80"
            style={{ color: textSecondary }}
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {editorMode === 'batch' && !initialCard ? (
              <button
                type="button"
                onClick={handleSaveBatch}
                disabled={parsedBatchCards.length === 0}
                className="px-5 py-2 disabled:opacity-40 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                style={{
                  backgroundColor: accentColor,
                  color: accentText,
                  boxShadow: `0 4px 14px ${accentGlow}`,
                }}
              >
                <Check className="w-4 h-4" />
                <span>Create All {parsedBatchCards.length} Cards</span>
              </button>
            ) : (
              <>
                {!initialCard && (
                  <button
                    type="button"
                    onClick={handleSaveAndAddAnother}
                    disabled={!frontText.trim() || !backText.trim()}
                    className="px-4 py-2 disabled:opacity-40 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all hover:opacity-90 active:scale-95"
                    style={{
                      backgroundColor: surfaceHover,
                      borderColor: borderColor,
                      color: textPrimary,
                    }}
                    title="Save this card and keep editor open to create another card immediately"
                  >
                    <span>Save & Add Another</span>
                  </button>
                )}
                <button
                  type="submit"
                  form="card-editor-form"
                  className="px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                  style={{
                    backgroundColor: accentColor,
                    color: accentText,
                    boxShadow: `0 4px 14px ${accentGlow}`,
                  }}
                >
                  <Check className="w-4 h-4" />
                  {initialCard ? 'Save Changes' : 'Create Card'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sketch Drawing Modal */}
      <SketchCanvasModal
        isOpen={isSketchOpen}
        onClose={() => setIsSketchOpen(false)}
        onSaveSketch={handleSaveSketch}
      />
    </div>
  );
}
