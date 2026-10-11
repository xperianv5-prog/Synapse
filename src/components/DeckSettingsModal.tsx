import React, { useState } from 'react';
import {
  X, Settings, Cpu, Layers, Zap, Download, Trash2, Check,
  Palette, History, AlertTriangle, Sparkles
} from 'lucide-react';
import { Deck, AlgorithmType, Flashcard } from '../types';
import { getAllAlgorithms } from '../algorithms/spacedRepetition';
import { Skin, APP_SKINS } from '../utils/skins';

interface DeckSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deck: Deck;
  cards: Flashcard[];
  onSaveDeck: (updatedDeck: Deck) => void;
  onDeleteDeck: (deckId: string) => void;
  activeSkin?: Skin;
  onOpenSkinSelector?: () => void;
  onSelectSkin?: (skinId: string) => void;
}

export function DeckSettingsModal({
  isOpen,
  onClose,
  deck,
  cards,
  onSaveDeck,
  onDeleteDeck,
  activeSkin,
  onOpenSkinSelector,
  onSelectSkin,
}: DeckSettingsModalProps) {
  const [title, setTitle] = useState(deck.title);
  const [description, setDescription] = useState(deck.description);
  const [category, setCategory] = useState(deck.category);
  const [algorithm, setAlgorithm] = useState<AlgorithmType>(deck.algorithm);
  const [color, setColor] = useState(deck.color || 'from-indigo-600 to-cyan-600');
  const [activeTab, setActiveTab] = useState<'general' | 'theme' | 'algorithm' | 'versions'>('general');

  React.useEffect(() => {
    if (isOpen) {
      setTitle(deck.title);
      setDescription(deck.description);
      setCategory(deck.category);
      setAlgorithm(deck.algorithm);
      setColor(deck.color || 'from-indigo-600 to-cyan-600');
      setActiveTab('general');
    }
  }, [isOpen, deck]);

  if (!isOpen) return null;

  const surfaceBg = activeSkin?.colors.surface || '#0f172a';
  const surfaceHover = activeSkin?.colors.surfaceHover || '#1e293b';
  const borderColor = activeSkin?.colors.border || '#1e293b';
  const textPrimary = activeSkin?.colors.textPrimary || '#f8fafc';
  const textSecondary = activeSkin?.colors.textSecondary || '#94a3b8';
  const accentColor = activeSkin?.colors.accent || '#6366f1';
  const accentText = activeSkin?.colors.accentText || '#ffffff';
  const accentGlow = activeSkin?.colors.accentGlow || 'rgba(99, 102, 241, 0.4)';

  const algorithms = getAllAlgorithms();

  const colorPresets = [
    { label: 'Indigo / Cyan', value: 'from-indigo-600 to-cyan-600' },
    { label: 'Blue / Ocean', value: 'from-blue-600 to-teal-500' },
    { label: 'Rose / Orange', value: 'from-rose-600 to-orange-500' },
    { label: 'Emerald / Green', value: 'from-emerald-600 to-teal-600' },
    { label: 'Purple / Violet', value: 'from-purple-600 to-indigo-600' },
    { label: 'Amber / Yellow', value: 'from-amber-600 to-orange-500' },
  ];

  const handleExportJson = () => {
    const data = {
      deck,
      cards,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.title.toLowerCase().replace(/\s+/g, '-')}-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDeck({
      ...deck,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      algorithm,
      color,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="border w-full max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200 transition-colors"
        style={{
          backgroundColor: surfaceBg,
          borderColor: borderColor,
          color: textPrimary,
        }}
      >
        
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor }}
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" style={{ color: accentColor }} />
            <h2 className="text-base font-bold" style={{ color: textPrimary }}>Deck Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:opacity-80 transition-colors"
            style={{ color: textSecondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div
          className="flex border-b px-5 text-xs font-semibold overflow-x-auto"
          style={{ borderColor, backgroundColor: surfaceHover }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className="py-2.5 px-3 border-b-2 transition-all shrink-0"
            style={{
              borderColor: activeTab === 'general' ? accentColor : 'transparent',
              color: activeTab === 'general' ? accentColor : textSecondary,
              fontWeight: activeTab === 'general' ? 700 : 500,
            }}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className="py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0"
            style={{
              borderColor: activeTab === 'theme' ? accentColor : 'transparent',
              color: activeTab === 'theme' ? accentColor : textSecondary,
              fontWeight: activeTab === 'theme' ? 700 : 500,
            }}
          >
            <Palette className="w-3.5 h-3.5" style={{ color: activeTab === 'theme' ? accentColor : undefined }} />
            <span>Theme & Colors</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('algorithm')}
            className="py-2.5 px-3 border-b-2 transition-all shrink-0"
            style={{
              borderColor: activeTab === 'algorithm' ? accentColor : 'transparent',
              color: activeTab === 'algorithm' ? accentColor : textSecondary,
              fontWeight: activeTab === 'algorithm' ? 700 : 500,
            }}
          >
            Spaced Repetition
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('versions')}
            className="py-2.5 px-3 border-b-2 transition-all shrink-0"
            style={{
              borderColor: activeTab === 'versions' ? accentColor : 'transparent',
              color: activeTab === 'versions' ? accentColor : textSecondary,
              fontWeight: activeTab === 'versions' ? 700 : 500,
            }}
          >
            Versions & Export
          </button>
        </div>

        {/* Form Body */}
        <form id="deck-settings-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: textSecondary }}>Deck Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors"
                  style={{
                    backgroundColor: surfaceHover,
                    borderColor,
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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: textSecondary }}>Category</label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Medicine, Languages, Computer Science"
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors"
                  style={{
                    backgroundColor: surfaceHover,
                    borderColor,
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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: textSecondary }}>Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border rounded-xl p-3 text-xs focus:outline-none resize-none transition-colors"
                  style={{
                    backgroundColor: surfaceHover,
                    borderColor,
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
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-5">
              {/* Theme Studio Button */}
              {onOpenSkinSelector && (
                <div
                  className="p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-md"
                  style={{
                    backgroundColor: surfaceHover,
                    borderColor: accentColor,
                  }}
                >
                  <div>
                    <span className="text-xs font-bold block" style={{ color: textPrimary }}>
                      Appearance Studio
                    </span>
                    <span className="text-[11px]" style={{ color: textSecondary }}>
                      Customize fonts, card elevation, and ambient lighting
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSkinSelector();
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                    style={{
                      backgroundColor: accentColor,
                      color: accentText,
                      boxShadow: `0 4px 12px ${accentGlow}`,
                    }}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Open Theme Studio</span>
                  </button>
                </div>
              )}

              {/* Theme Changer Grid */}
              {onSelectSkin && (
                <div className="space-y-2">
                  <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: textPrimary }}>
                    <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    <span>Select App Theme</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {APP_SKINS.map((skin) => {
                      const isCurrent = activeSkin?.id === skin.id;
                      return (
                        <button
                          key={skin.id}
                          type="button"
                          onClick={() => onSelectSkin(skin.id)}
                          className="p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all text-xs"
                          style={{
                            backgroundColor: skin.colors.surface,
                            borderColor: isCurrent ? accentColor : skin.colors.border,
                            boxShadow: isCurrent ? `0 0 10px ${accentGlow}` : undefined,
                          }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold truncate" style={{ color: skin.colors.textPrimary }}>
                              {skin.name}
                            </span>
                            {isCurrent && <Check className="w-3 h-3" style={{ color: accentColor }} />}
                          </div>
                          <div className="flex items-center gap-1">
                            {skin.colors.swatches.map((c, i) => (
                              <span key={i} className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Deck Card Cover Gradient */}
              <div className="space-y-2 pt-1 border-t" style={{ borderColor }}>
                <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: textSecondary }}>
                  <Palette className="w-3.5 h-3.5" style={{ color: accentColor }} />
                  <span>Deck Card Cover Gradient</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {colorPresets.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setColor(p.value)}
                      className={`h-10 rounded-xl bg-gradient-to-r ${p.value} border-2 transition-all ${
                        color === p.value ? 'border-white scale-102' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      style={{ boxShadow: color === p.value ? `0 0 0 2px ${accentColor}` : undefined }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'algorithm' && (
            <div className="space-y-3">
              <div className="text-xs mb-1" style={{ color: textSecondary }}>
                Select the spaced repetition schedule engine for this deck. The architecture is completely modular so you can switch at any time.
              </div>

              {algorithms.map((algo) => (
                <label
                  key={algo.type}
                  className="block border rounded-2xl p-3.5 cursor-pointer transition-all"
                  style={{
                    backgroundColor: algorithm === algo.type ? `${accentColor}18` : surfaceHover,
                    borderColor: algorithm === algo.type ? accentColor : borderColor,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold" style={{ color: textPrimary }}>{algo.name}</span>
                    <input
                      type="radio"
                      name="algorithm"
                      value={algo.type}
                      checked={algorithm === algo.type}
                      onChange={() => setAlgorithm(algo.type)}
                      className="w-4 h-4"
                    />
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: textSecondary }}>
                    {algo.description}
                  </p>
                </label>
              ))}
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="space-y-4">
              <div
                className="border rounded-2xl p-4 space-y-2"
                style={{ backgroundColor: surfaceHover, borderColor }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: textPrimary }}>
                    <History className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    Version Control
                  </span>
                  <span className="text-xs font-mono font-bold" style={{ color: accentColor }}>v{deck.version || '1.0.0'}</span>
                </div>
                <p className="text-[11px]" style={{ color: textSecondary }}>
                  Track revision changelogs and audit changes across local edits and community releases.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold block" style={{ color: textSecondary }}>Backup & Export</span>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="w-full py-2.5 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-98"
                  style={{
                    backgroundColor: surfaceHover,
                    borderColor,
                    color: textPrimary,
                  }}
                >
                  <Download className="w-4 h-4" style={{ color: accentColor }} />
                  <span>Export Deck & Cards (JSON)</span>
                </button>
              </div>

              <div className="pt-4 border-t" style={{ borderColor }}>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${deck.title}" and all its ${cards.length} cards?`)) {
                      onDeleteDeck(deck.id);
                      onClose();
                    }
                  }}
                  className="w-full py-2.5 px-3 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold rounded-xl border border-rose-800/60 flex items-center justify-center gap-2 transition-all"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Delete Deck</span>
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div
          className="px-5 py-3.5 border-t flex items-center justify-end gap-2.5 shrink-0"
          style={{ borderColor, backgroundColor: surfaceHover }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold transition-colors"
            style={{ color: textSecondary }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="deck-settings-form"
            className="px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg transition-all active:scale-95"
            style={{
              backgroundColor: accentColor,
              color: accentText,
              boxShadow: `0 4px 14px ${accentGlow}`,
            }}
          >
            <Check className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
