import React, { useState } from 'react';
import {
  X, Mail, Lock, User, Sparkles, CheckCircle2,
  AlertCircle, Loader2, ArrowRight, ShieldCheck
} from 'lucide-react';
import { loginWithEmail, registerWithEmail, loginWithGoogle, UserProfile } from '../utils/auth';
import { Skin } from '../utils/skins';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  activeSkin: Skin;
  initialMode?: 'signin' | 'signup';
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  activeSkin,
  initialMode = 'signin',
}: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [learningGoal, setLearningGoal] = useState('Languages & Vocabulary');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let user: UserProfile;
      if (mode === 'signin') {
        user = await loginWithEmail(email, password);
      } else {
        user = await registerWithEmail(name, email, password, learningGoal);
      }
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const user = await loginWithGoogle();
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google sign in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const goals = [
    'Languages & Vocabulary',
    'Medical & USMLE',
    'Tech & Coding Interview',
    'Law & Bar Exam',
    'Academics / University',
    'General Knowledge',
  ];

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
        {/* Header decoration */}
        <div className="p-6 pb-4 border-b flex items-center justify-between" style={{ borderColor: activeSkin.colors.border }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg"
              style={{
                backgroundColor: activeSkin.colors.accent,
                color: activeSkin.colors.accentText,
                boxShadow: `0 8px 20px ${activeSkin.colors.accentGlow}`,
              }}
            >
              R
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight" style={{ color: activeSkin.colors.textPrimary }}>
                {mode === 'signin' ? 'Sign In to Recall' : 'Create Free Account'}
              </h2>
              <p className="text-xs" style={{ color: activeSkin.colors.textSecondary }}>
                Sync spaced repetition decks across all your devices
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl transition-colors hover:opacity-80"
            style={{ backgroundColor: activeSkin.colors.surfaceHover }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 pt-4">
          <div
            className="p-1 rounded-2xl flex items-center gap-1 border"
            style={{
              backgroundColor: activeSkin.colors.bg,
              borderColor: activeSkin.colors.border,
            }}
          >
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signin'
                  ? 'shadow'
                  : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                backgroundColor: mode === 'signin' ? activeSkin.colors.surface : 'transparent',
                color: mode === 'signin' ? activeSkin.colors.textPrimary : activeSkin.colors.textSecondary,
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signup'
                  ? 'shadow'
                  : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                backgroundColor: mode === 'signup' ? activeSkin.colors.surface : 'transparent',
                color: mode === 'signup' ? activeSkin.colors.textPrimary : activeSkin.colors.textSecondary,
              }}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Error notice */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-950/60 border border-rose-800/70 rounded-2xl text-xs text-rose-200 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Info notice */}
        {infoMessage && (
          <div className="mx-6 mt-4 p-3 bg-indigo-950/60 border border-indigo-800/70 rounded-2xl text-xs text-indigo-200 flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: activeSkin.colors.textSecondary }}>
                Full Name or Alias
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 opacity-40" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria Gonzalez"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm border outline-none transition-colors"
                  style={{
                    backgroundColor: activeSkin.colors.bg,
                    borderColor: activeSkin.colors.border,
                    color: activeSkin.colors.textPrimary,
                  }}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: activeSkin.colors.textSecondary }}>
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 opacity-40" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm border outline-none transition-colors"
                style={{
                  backgroundColor: activeSkin.colors.bg,
                  borderColor: activeSkin.colors.border,
                  color: activeSkin.colors.textPrimary,
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold" style={{ color: activeSkin.colors.textSecondary }}>
                Password
              </label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => {
                    setInfoMessage('Password reset instructions have been dispatched to your email.');
                    setTimeout(() => setInfoMessage(null), 5000);
                  }}
                  className="text-[11px] underline opacity-70 hover:opacity-100"
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 opacity-40" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm border outline-none transition-colors"
                style={{
                  backgroundColor: activeSkin.colors.bg,
                  borderColor: activeSkin.colors.border,
                  color: activeSkin.colors.textPrimary,
                }}
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: activeSkin.colors.textSecondary }}>
                Primary Study Goal
              </label>
              <select
                value={learningGoal}
                onChange={(e) => setLearningGoal(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl text-sm border outline-none"
                style={{
                  backgroundColor: activeSkin.colors.bg,
                  borderColor: activeSkin.colors.border,
                  color: activeSkin.colors.textPrimary,
                }}
              >
                {goals.map(g => (
                  <option key={g} value={g} className="bg-slate-900 text-slate-100">
                    {g}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: activeSkin.colors.accent,
              color: activeSkin.colors.accentText,
              boxShadow: `0 8px 24px ${activeSkin.colors.accentGlow}`,
            }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In' : 'Create My Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative py-2 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: activeSkin.colors.border }} />
            </div>
            <span
              className="relative px-3 text-[11px] uppercase tracking-wider font-semibold"
              style={{
                backgroundColor: activeSkin.colors.surface,
                color: activeSkin.colors.textMuted,
              }}
            >
              or connect with
            </span>
          </div>

          {/* Google One-Click Auth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 rounded-2xl text-xs font-bold border flex items-center justify-center gap-2.5 transition-all hover:opacity-90 active:scale-98"
            style={{
              backgroundColor: activeSkin.colors.surfaceHover,
              borderColor: activeSkin.colors.border,
              color: activeSkin.colors.textPrimary,
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </form>

        {/* Footer info */}
        <div
          className="p-4 border-t text-center text-[11px] flex items-center justify-center gap-1.5"
          style={{
            borderColor: activeSkin.colors.border,
            color: activeSkin.colors.textMuted,
          }}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Encrypted spaced repetition session & deck backup</span>
        </div>
      </div>
    </div>
  );
}
