import React, { useState } from 'react';
import {
  X, UploadCloud, Check, Shield, GitCommit, AlertCircle,
  Loader2, Globe, Lock
} from 'lucide-react';
import { Deck, Flashcard } from '../types';
import { Skin } from '../utils/skins';
import { getCardFrontText, getCardBackText } from '../utils/cardHelpers';

interface PublishDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  deck: Deck;
  cards: Flashcard[];
  onPublished: (updatedDeck: Deck) => void;
  activeSkin?: Skin;
}

export function PublishDeckModal({
  isOpen,
  onClose,
  deck,
  cards,
  onPublished,
  activeSkin,
}: PublishDeckModalProps) {
  const [title, setTitle] = useState(deck.title);
  const [description, setDescription] = useState(deck.description);
  const [authorName, setAuthorName] = useState(deck.sharingControl?.authorName || 'Learner');
  const [isPublic, setIsPublic] = useState(deck.sharingControl?.isPublic ?? true);
  const [allowRemix, setAllowRemix] = useState(deck.sharingControl?.allowRemix ?? true);
  const [license, setLicense] = useState(deck.sharingControl?.license || 'CC-BY-SA 4.0');
  
  // Versioning
  const currentVer = deck.version || '1.0.0';
  const nextVerDefault = incrementVersion(currentVer);
  const [version, setVersion] = useState(deck.versionHistory?.length ? nextVerDefault : currentVer);
  const [changelog, setChangelog] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTitle(deck.title);
      setDescription(deck.description);
      setAuthorName(deck.sharingControl?.authorName || 'Learner');
      setIsPublic(deck.sharingControl?.isPublic ?? true);
      setAllowRemix(deck.sharingControl?.allowRemix ?? true);
      setLicense(deck.sharingControl?.license || 'CC-BY-SA 4.0');
      const curV = deck.version || '1.0.0';
      setVersion(deck.versionHistory?.length ? incrementVersion(curV) : curV);
      setChangelog('');
      setError(null);
    }
  }, [isOpen, deck]);

  if (!isOpen) return null;

  function incrementVersion(ver: string): string {
    const parts = ver.split('.').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      return `${parts[0]}.${parts[1] + 1}.0`;
    }
    return '1.1.0';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare sample cards
      const sampleCards = cards.slice(0, 5).map(c => ({
        frontText: getCardFrontText(c),
        backText: getCardBackText(c),
        hasImage: !!c.front?.media?.imageUrl,
        hasAudio: !!c.front?.media?.audioData,
      }));

      const res = await fetch('/api/community/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category: deck.category,
          tags: deck.tags,
          author: authorName.trim(),
          version: version.trim(),
          changelog: changelog.trim() || 'Updated deck cards and media notes.',
          sharingControl: {
            isPublic,
            allowRemix,
            license,
            authorName: authorName.trim(),
          },
          sampleCards,
          cards,
          existingId: deck.communityId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish deck to cloud.');
      }

      const today = new Date().toISOString().split('T')[0];
      const updatedVersionHistory = [
        {
          version: version.trim(),
          date: today,
          notes: changelog.trim() || 'Published release.',
          cardsCount: cards.length,
        },
        ...(deck.versionHistory || []),
      ];

      const updatedDeck: Deck = {
        ...deck,
        title: title.trim(),
        description: description.trim(),
        version: version.trim(),
        versionHistory: updatedVersionHistory,
        communityId: data.deck.id,
        isCommunityShared: true,
        sharingControl: {
          isPublic,
          allowRemix,
          authorName: authorName.trim(),
          license,
          changelog: changelog.trim(),
        },
      };

      onPublished(updatedDeck);
      onClose();
    } catch (err: any) {
      console.error('Publish error:', err);
      setError(err.message || 'Failed to publish to community.');
    } finally {
      setLoading(false);
    }
  };

  const surfaceBg = activeSkin?.colors.surface || '#0f172a';
  const surfaceHover = activeSkin?.colors.surfaceHover || '#1e293b';
  const borderColor = activeSkin?.colors.border || '#1e293b';
  const textPrimary = activeSkin?.colors.textPrimary || '#f8fafc';
  const textSecondary = activeSkin?.colors.textSecondary || '#94a3b8';
  const accentColor = activeSkin?.colors.accent || '#6366f1';
  const accentText = activeSkin?.colors.accentText || '#ffffff';
  const accentGlow = activeSkin?.colors.accentGlow || 'rgba(99, 102, 241, 0.4)';

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
          <div>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: textPrimary }}>
              <UploadCloud className="w-4 h-4" style={{ color: accentColor }} />
              Publish Deck to Cloud Community
            </h2>
            <p className="text-xs" style={{ color: textSecondary }}>Configure versioning, remixing permissions, and licensing</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:opacity-80 transition-colors"
            style={{ color: textSecondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form id="publish-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Deck Title & Author */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: textSecondary }}>Public Deck Title</label>
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
            <label className="text-xs font-semibold" style={{ color: textSecondary }}>Author Name</label>
            <input
              type="text"
              required
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
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
            <label className="text-xs font-semibold" style={{ color: textSecondary }}>Summary / Description</label>
            <textarea
              rows={2}
              required
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

          {/* Versioning Controls */}
          <div
            className="border rounded-2xl p-3.5 space-y-3"
            style={{ backgroundColor: surfaceHover, borderColor }}
          >
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: accentColor }}>
              <GitCommit className="w-3.5 h-3.5" />
              <span>Versioning & Release Audit</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[11px]" style={{ color: textSecondary }}>Current Version</span>
                <div
                  className="px-3 py-1.5 border rounded-xl text-xs font-mono"
                  style={{
                    backgroundColor: surfaceBg,
                    borderColor,
                    color: textSecondary,
                  }}
                >
                  v{currentVer}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-semibold" style={{ color: textPrimary }}>New Release Version</span>
                <input
                  type="text"
                  required
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full border rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none transition-colors"
                  style={{
                    backgroundColor: surfaceBg,
                    borderColor,
                    color: accentColor,
                  }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium" style={{ color: textSecondary }}>Changelog / Release Notes</label>
              <input
                type="text"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="e.g. Added 6 new cardiovascular cards and audio notes"
                className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors"
                style={{
                  backgroundColor: surfaceBg,
                  borderColor,
                  color: textPrimary,
                }}
              />
            </div>
          </div>

          {/* Sharing Controls & Permissions */}
          <div
            className="border rounded-2xl p-3.5 space-y-3"
            style={{ backgroundColor: surfaceHover, borderColor }}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Sharing Controls & Access</span>
            </div>

            <div className="space-y-2">
              <label
                className="flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors"
                style={{ backgroundColor: isPublic ? `${accentColor}18` : surfaceBg }}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" style={{ color: accentColor }} />
                  <div>
                    <span className="text-xs font-semibold block" style={{ color: textPrimary }}>Public Listing</span>
                    <span className="text-[11px]" style={{ color: textSecondary }}>Visible on Community Deck Hub</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
              </label>

              <label
                className="flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors"
                style={{ backgroundColor: allowRemix ? `${accentColor}18` : surfaceBg }}
              >
                <div>
                  <span className="text-xs font-semibold block" style={{ color: textPrimary }}>Allow Remixing & Forking</span>
                  <span className="text-[11px]" style={{ color: textSecondary }}>Other learners can build on top of your deck</span>
                </div>
                <input
                  type="checkbox"
                  checked={allowRemix}
                  onChange={(e) => setAllowRemix(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
              </label>
            </div>

            <div className="space-y-1 pt-1 border-t" style={{ borderColor }}>
              <label className="text-[11px]" style={{ color: textSecondary }}>Open License</label>
              <select
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                className="w-full border rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-colors"
                style={{
                  backgroundColor: surfaceBg,
                  borderColor,
                  color: textPrimary,
                }}
              >
                <option value="CC-BY-SA 4.0">Creative Commons CC-BY-SA 4.0 (Recommended)</option>
                <option value="MIT">MIT Open Source</option>
                <option value="CC-BY-NC 4.0">CC-BY-NC (Non-Commercial)</option>
                <option value="Personal / Restricted">Personal All Rights Reserved</option>
              </select>
            </div>
          </div>
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
            form="publish-form"
            disabled={loading}
            className="px-5 py-2 disabled:opacity-50 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg transition-all active:scale-95"
            style={{
              backgroundColor: accentColor,
              color: accentText,
              boxShadow: `0 4px 14px ${accentGlow}`,
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing v{version}...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Publish Release v{version}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
