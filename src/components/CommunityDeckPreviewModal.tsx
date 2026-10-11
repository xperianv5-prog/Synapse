import { useState } from 'react';
import {
  X, Download, Check, History, Globe, User, ShieldCheck,
  Star, Heart, HelpCircle
} from 'lucide-react';
import { CommunityDeck } from '../types';
import { Skin } from '../utils/skins';

interface CommunityDeckPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  deck: CommunityDeck | null;
  onApproveImport: (communityDeck: CommunityDeck) => void;
  onToggleLike: (deckId: string) => void;
  activeSkin?: Skin;
}

export function CommunityDeckPreviewModal({
  isOpen,
  onClose,
  deck,
  onApproveImport,
  onToggleLike,
  activeSkin,
}: CommunityDeckPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'cards' | 'versions'>('cards');
  const [isImported, setIsImported] = useState(false);

  if (!isOpen || !deck) return null;

  const handleImport = () => {
    onApproveImport(deck);
    setIsImported(true);
    setTimeout(() => {
      setIsImported(false);
      onClose();
    }, 900);
  };

  const sampleOrFullCards = deck.cards && deck.cards.length > 0 ? deck.cards : deck.sampleCards || [];

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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
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
          className="p-5 border-b shrink-0"
          style={{
            backgroundColor: `${surfaceHover}80`,
            borderColor: borderColor,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                  style={{
                    backgroundColor: `${accentColor}1f`,
                    borderColor: `${accentColor}40`,
                    color: accentColor,
                  }}
                >
                  {deck.category}
                </span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border"
                  style={{
                    backgroundColor: surfaceHover,
                    borderColor: borderColor,
                    color: textSecondary,
                  }}
                >
                  v{deck.version}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {deck.difficulty}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight" style={{ color: textPrimary }}>
                {deck.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:opacity-80 transition-colors"
              style={{ color: textSecondary }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs sm:text-sm mt-2 leading-relaxed" style={{ color: textSecondary }}>
            {deck.description}
          </p>

          {/* Author & Metrics */}
          <div
            className="flex items-center justify-between mt-3.5 pt-3 border-t text-xs"
            style={{ borderColor: borderColor, color: textSecondary }}
          >
            <div className="flex items-center gap-2">
              {deck.authorAvatar ? (
                <img
                  src={deck.authorAvatar}
                  alt={deck.author}
                  className="w-6 h-6 rounded-full border object-cover"
                  style={{ borderColor: borderColor }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center border"
                  style={{ backgroundColor: surfaceHover, borderColor: borderColor }}
                >
                  <User className="w-3.5 h-3.5" style={{ color: textSecondary }} />
                </div>
              )}
              <span className="font-medium" style={{ color: textPrimary }}>{deck.author}</span>
              {deck.sharingControl?.isVerified && (
                <span title="Verified Educator">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-amber-400 font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{deck.rating.toFixed(1)}</span>
                <span className="font-normal opacity-70">({deck.reviewsCount})</span>
              </div>
              <button
                type="button"
                onClick={() => onToggleLike(deck.id)}
                className={`flex items-center gap-1 transition-colors ${
                  deck.userLiked ? 'text-rose-400' : 'hover:text-rose-400'
                }`}
                style={{ color: deck.userLiked ? '#f43f5e' : textSecondary }}
              >
                <Heart className={`w-3.5 h-3.5 ${deck.userLiked ? 'fill-rose-400' : ''}`} />
                <span>{deck.likes}</span>
              </button>
              <div className="flex items-center gap-1" style={{ color: textSecondary }}>
                <Download className="w-3.5 h-3.5" />
                <span>{deck.downloads}</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div
          className="flex border-b px-5 text-xs font-semibold"
          style={{
            backgroundColor: surfaceBg,
            borderColor: borderColor,
          }}
        >
          <button
            onClick={() => setActiveTab('cards')}
            className="py-2.5 px-4 border-b-2 transition-all flex items-center gap-1.5"
            style={{
              borderColor: activeTab === 'cards' ? accentColor : 'transparent',
              color: activeTab === 'cards' ? accentColor : textSecondary,
            }}
          >
            <span>Cards Preview ({sampleOrFullCards.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className="py-2.5 px-4 border-b-2 transition-all flex items-center gap-1.5"
            style={{
              borderColor: activeTab === 'versions' ? accentColor : 'transparent',
              color: activeTab === 'versions' ? accentColor : textSecondary,
            }}
          >
            <History className="w-3.5 h-3.5" />
            <span>Version History ({deck.versions?.length || 1})</span>
          </button>
        </div>

        {/* Tab 1: Cards Preview List */}
        {activeTab === 'cards' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-xl p-3 text-xs text-indigo-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Previewing all cards before download. No background sync occurs without your explicit confirmation.
              </span>
            </div>

            {sampleOrFullCards.map((card: any, idx: number) => {
              const front = card.front?.text || card.frontText || '';
              const back = card.back?.text || card.backText || '';
              const explanation = card.back?.explanation || '';
              return (
                <div
                  key={idx}
                  className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 space-y-2 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                      Card #{idx + 1}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider block mb-0.5">
                      Front Prompt
                    </span>
                    <p className="text-sm font-semibold text-slate-100 whitespace-pre-line">
                      {front}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-0.5">
                      Back Answer
                    </span>
                    <p className="text-xs text-slate-200 whitespace-pre-line">
                      {back}
                    </p>
                  </div>

                  {explanation && (
                    <div className="bg-slate-950/50 p-2 rounded-lg text-[11px] text-slate-400">
                      <span className="text-indigo-300 font-medium">Note: </span>
                      {explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Version History & Changelog */}
        {activeTab === 'versions' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="text-xs text-slate-400 mb-2">
              Sharing Controls & Version Tracking: All revisions made by the author are audited with release notes.
            </div>

            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {(deck.versions || [{ version: deck.version, date: deck.updatedDate, notes: 'Initial public release.' }]).map((ver, idx) => (
                <div key={idx} className="relative pl-7 space-y-1">
                  <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-slate-900" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100 font-mono">v{ver.version}</span>
                    <span className="text-[11px] text-slate-500 font-mono">{ver.date}</span>
                    {idx === 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 text-emerald-400 rounded-full font-semibold border border-emerald-800">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 bg-slate-800/60 border border-slate-700/70 p-2.5 rounded-xl">
                    {ver.notes}
                  </p>
                </div>
              ))}
            </div>

            {/* Sharing Controls & License Information */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 mt-4 text-xs">
              <span className="font-semibold text-slate-200 block">Sharing Policy & Rights</span>
              <div className="grid grid-cols-2 gap-2 text-slate-400">
                <div>
                  <span className="text-slate-500 block">License:</span>
                  <span className="text-slate-300 font-mono">{deck.sharingControl?.license || 'CC-BY-SA 4.0'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Remixing / Forking:</span>
                  <span className="text-emerald-400 font-medium">
                    {deck.sharingControl?.allowRemix !== false ? 'Allowed' : 'Read-Only'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Explicit Approval Footer */}
        <div
          className="p-4 border-t flex items-center justify-between shrink-0"
          style={{
            backgroundColor: surfaceBg,
            borderColor: borderColor,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl hover:opacity-80 transition-all"
            style={{ color: textSecondary }}
          >
            Close Preview
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={isImported}
            className="px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
            style={{
              backgroundColor: isImported ? '#059669' : accentColor,
              color: accentText,
              boxShadow: `0 4px 14px ${accentGlow}`,
            }}
          >
            {isImported ? (
              <>
                <Check className="w-4 h-4" />
                <span>Imported to Your Library!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Approve & Add Deck to My Library</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
