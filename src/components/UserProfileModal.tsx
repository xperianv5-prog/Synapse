import {
  X, LogOut, CheckCircle2, Award, Zap,
  Layers, CloudCheck, Sparkles, Palette
} from 'lucide-react';
import { UserProfile, logout } from '../utils/auth';
import { Skin } from '../utils/skins';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  activeSkin: Skin;
  deckCount: number;
  cardCount: number;
  onLogout: () => void;
  onOpenSkinSelector: () => void;
  onOpenAuth: () => void;
}

export function UserProfileModal({
  isOpen,
  onClose,
  user,
  activeSkin,
  deckCount,
  cardCount,
  onLogout,
  onOpenSkinSelector,
  onOpenAuth,
}: UserProfileModalProps) {
  if (!isOpen) return null;

  const isGuest = user.id === 'guest_user';

  const handleSignOut = () => {
    logout();
    onLogout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div
        className="relative w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: activeSkin.colors.surface,
          borderColor: activeSkin.colors.border,
          color: activeSkin.colors.textPrimary,
        }}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b flex items-center justify-between" style={{ borderColor: activeSkin.colors.border }}>
          <h2 className="text-lg font-black tracking-tight" style={{ color: activeSkin.colors.textPrimary }}>
            Account & Sync
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl transition-colors hover:opacity-80"
            style={{ backgroundColor: activeSkin.colors.surfaceHover }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 shadow-md"
              style={{ borderColor: activeSkin.colors.accent }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold" style={{ color: activeSkin.colors.textPrimary }}>
                  {user.name}
                </h3>
                <span
                  className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
                  style={{
                    backgroundColor: activeSkin.colors.accent,
                    color: activeSkin.colors.accentText,
                  }}
                >
                  {user.tier}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: activeSkin.colors.textSecondary }}>
                {user.email}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mt-1.5">
                <CloudCheck className="w-3.5 h-3.5" />
                <span>Cloud Sync Active</span>
              </div>
            </div>
          </div>

          {/* Cloud Stats Bento */}
          <div
            className="p-4 rounded-2xl border grid grid-cols-3 gap-2 text-center"
            style={{
              backgroundColor: activeSkin.colors.bg,
              borderColor: activeSkin.colors.border,
            }}
          >
            <div>
              <span className="text-[10px] font-semibold block uppercase" style={{ color: activeSkin.colors.textMuted }}>
                Streak
              </span>
              <span className="text-lg font-black text-amber-400 flex items-center justify-center gap-1">
                <Zap className="w-4 h-4 fill-amber-400" />
                {user.streakDays}d
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold block uppercase" style={{ color: activeSkin.colors.textMuted }}>
                Decks
              </span>
              <span className="text-lg font-black" style={{ color: activeSkin.colors.textPrimary }}>
                {deckCount}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-semibold block uppercase" style={{ color: activeSkin.colors.textMuted }}>
                Total Cards
              </span>
              <span className="text-lg font-black" style={{ color: activeSkin.colors.accent }}>
                {cardCount}
              </span>
            </div>
          </div>

          {/* Current Active Skin preview block */}
          <div
            onClick={onOpenSkinSelector}
            className="p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all hover:opacity-95 active:scale-98"
            style={{
              backgroundColor: activeSkin.colors.surfaceHover,
              borderColor: activeSkin.colors.border,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow"
                style={{
                  backgroundColor: activeSkin.colors.accent,
                  color: activeSkin.colors.accentText,
                }}
              >
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block" style={{ color: activeSkin.colors.textPrimary }}>
                  App Skin: {activeSkin.name}
                </span>
                <span className="text-[11px]" style={{ color: activeSkin.colors.textSecondary }}>
                  Tap to change from 12 custom skins
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {activeSkin.colors.swatches.map((color, i) => (
                <span
                  key={i}
                  className="w-3.5 h-3.5 rounded-full border border-black/20"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {isGuest ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-98"
                style={{
                  backgroundColor: activeSkin.colors.accent,
                  color: activeSkin.colors.accentText,
                  boxShadow: `0 8px 20px ${activeSkin.colors.accentGlow}`,
                }}
              >
                <Sparkles className="w-4 h-4" />
                <span>Sign In or Create Full Account</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="flex-1 py-2.5 rounded-2xl text-xs font-bold border transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: activeSkin.colors.surfaceHover,
                    borderColor: activeSkin.colors.border,
                    color: activeSkin.colors.textPrimary,
                  }}
                >
                  Switch Account
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-600/40 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
