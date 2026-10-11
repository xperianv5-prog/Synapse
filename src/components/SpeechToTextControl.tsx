import { useState, useRef, useEffect } from 'react';
import {
  Mic, Globe, ChevronDown, Check, Loader2, Sparkles, X, Volume2
} from 'lucide-react';
import {
  SUPPORTED_SPEECH_LANGUAGES,
  SpeechLanguage,
  startPreciseSpeechRecognition,
  AudioRecorder,
  transcribeAudioWithGemini,
} from '../utils/audio';
import { Skin } from '../utils/skins';

interface SpeechToTextControlProps {
  onTranscript: (transcript: string, detectedLanguage?: string) => void;
  label?: string;
  activeSkin?: Skin;
  compact?: boolean;
}

export function SpeechToTextControl({
  onTranscript,
  label = 'Dictate',
  activeSkin,
  compact = false,
}: SpeechToTextControlProps) {
  const [isListening, setIsListening] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [recognizedLangBadge, setRecognizedLangBadge] = useState<string | null>(null);
  const [precisionMode, setPrecisionMode] = useState<'gemini' | 'browser'>('browser');
  const [isGeminiProcessing, setIsGeminiProcessing] = useState(false);
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLangObj = SUPPORTED_SPEECH_LANGUAGES.find(l => l.code === selectedLanguage) || SUPPORTED_SPEECH_LANGUAGES[0];

  const stopListening = async () => {
    if (precisionMode === 'gemini' && audioRecorderRef.current) {
      setIsListening(false);
      setIsGeminiProcessing(true);
      try {
        const recording = await audioRecorderRef.current.stop();
        const res = await transcribeAudioWithGemini(recording.base64Data, recording.mimeType, selectedLanguage);
        if (res.transcript) {
          onTranscript(res.transcript, res.detectedLanguage);
          setRecognizedLangBadge(`${res.detectedLanguage} (${res.confidence}% precision)`);
        }
      } catch (err: any) {
        console.error('Gemini transcription error:', err);
      } finally {
        setIsGeminiProcessing(false);
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    }
  };

  const startListening = async () => {
    setInterimText('');
    setRecognizedLangBadge(null);

    if (precisionMode === 'gemini') {
      try {
        const rec = new AudioRecorder();
        audioRecorderRef.current = rec;
        await rec.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Microphone error for Gemini recording:', err);
        setMicErrorMessage('Microphone access denied or unavailable.');
        setTimeout(() => setMicErrorMessage(null), 4000);
      }
      return;
    }

    // High precision browser speech recognition
    const session = startPreciseSpeechRecognition({
      language: selectedLanguage,
      continuous: false,
      onInterim: (interim) => {
        setInterimText(interim);
      },
      onResult: (finalText, detectedLang, confidence) => {
        onTranscript(finalText, detectedLang);
        setRecognizedLangBadge(`${detectedLang || currentLangObj.name} (${confidence || 98}% precision)`);
        setInterimText('');
        setIsListening(false);
      },
      onError: (err) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
        setMicErrorMessage('Speech recognition unavailable. Try typing or switching modes.');
        setTimeout(() => setMicErrorMessage(null), 4000);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });

    if (!session) {
      // If Web Speech not supported, automatically switch to Gemini speech recognition!
      setPrecisionMode('gemini');
      try {
        const rec = new AudioRecorder();
        audioRecorderRef.current = rec;
        await rec.start();
        setIsListening(true);
      } catch {
        setMicErrorMessage('Microphone not supported in this environment.');
        setTimeout(() => setMicErrorMessage(null), 4000);
      }
      return;
    }

    recognitionRef.current = session;
    setIsListening(true);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1.5" ref={dropdownRef}>
      {/* Speech Button */}
      <button
        type="button"
        onClick={toggleListening}
        disabled={isGeminiProcessing}
        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm ${
          isListening
            ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-500/50'
            : isGeminiProcessing
            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
            : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80'
        }`}
        style={
          !isListening && !isGeminiProcessing && activeSkin
            ? {
                backgroundColor: activeSkin.colors.surfaceHover,
                borderColor: activeSkin.colors.border,
                color: activeSkin.colors.textPrimary,
              }
            : undefined
        }
        title="Dictate with language recognition & high precision"
      >
        {isGeminiProcessing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
        ) : (
          <Mic className={`w-3.5 h-3.5 ${isListening ? 'text-white' : 'text-indigo-400'}`} />
        )}
        <span>
          {isListening
            ? 'Listening...'
            : isGeminiProcessing
            ? 'Transcribing...'
            : label}
        </span>
      </button>

      {/* Language Selector Pill */}
      <button
        type="button"
        onClick={() => setIsLangDropdownOpen(v => !v)}
        className="px-2 py-1.5 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/70 flex items-center gap-1 transition-colors"
        style={
          activeSkin
            ? {
                backgroundColor: activeSkin.colors.surfaceHover,
                borderColor: activeSkin.colors.border,
                color: activeSkin.colors.textSecondary,
              }
            : undefined
        }
        title="Select spoken language for recognition"
      >
        <span className="text-xs">{currentLangObj.flag}</span>
        {!compact && <span className="max-w-[85px] truncate text-[11px]">{currentLangObj.name}</span>}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {/* Language Selector Dropdown Popover */}
      {isLangDropdownOpen && (
        <div
          className="absolute right-0 top-full mt-1.5 w-64 max-h-72 overflow-y-auto rounded-2xl border shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 select-none"
          style={{
            backgroundColor: activeSkin?.colors.surface || '#0f172a',
            borderColor: activeSkin?.colors.border || '#1e293b',
            color: activeSkin?.colors.textPrimary || '#f8fafc',
          }}
        >
          <div className="px-2.5 py-1.5 border-b flex items-center justify-between text-[11px] font-semibold" style={{ borderColor: activeSkin?.colors.border || '#1e293b' }}>
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-indigo-400" />
              <span>Language Recognition</span>
            </span>
            <span className="text-[10px] opacity-70">16 Languages</span>
          </div>

          {/* Engine toggle */}
          <div className="p-1.5 border-b flex items-center gap-1 text-[10px]" style={{ borderColor: activeSkin?.colors.border || '#1e293b' }}>
            <button
              type="button"
              onClick={() => setPrecisionMode('browser')}
              className={`flex-1 py-1 rounded-lg font-bold transition-all ${
                precisionMode === 'browser'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              Web Speech
            </button>
            <button
              type="button"
              onClick={() => setPrecisionMode('gemini')}
              className={`flex-1 py-1 rounded-lg font-bold transition-all ${
                precisionMode === 'gemini'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              Gemini AI (Max Precision)
            </button>
          </div>

          <div className="py-1 space-y-0.5">
            {SUPPORTED_SPEECH_LANGUAGES.map((lang) => {
              const isSelected = selectedLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setSelectedLanguage(lang.code);
                    setIsLangDropdownOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-indigo-600/30 text-indigo-200 font-bold' : 'hover:bg-slate-800/60'
                  }`}
                  style={
                    isSelected && activeSkin
                      ? {
                          backgroundColor: `${activeSkin.colors.accent}25`,
                          color: activeSkin.colors.accent,
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <div>
                      <span className="block text-xs leading-none">{lang.name}</span>
                      <span className="text-[10px] opacity-60 leading-none">{lang.nativeName}</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Real-time Interim or Precision Badge */}
      {(isListening && interimText) && (
        <div className="absolute left-0 -bottom-8 whitespace-nowrap z-30 px-2.5 py-0.5 rounded-lg bg-indigo-950/90 border border-indigo-700/60 text-[11px] text-indigo-200 shadow-lg animate-in fade-in">
          "{interimText}"
        </div>
      )}

      {micErrorMessage && (
        <div className="absolute left-0 -bottom-8 whitespace-nowrap z-30 px-2.5 py-0.5 rounded-lg bg-rose-950/90 border border-rose-700/60 text-[11px] text-rose-200 shadow-lg animate-in fade-in flex items-center gap-1">
          <span>{micErrorMessage}</span>
          <button type="button" onClick={() => setMicErrorMessage(null)} className="hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {recognizedLangBadge && (
        <div className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <Globe className="w-2.5 h-2.5" />
          <span>{recognizedLangBadge}</span>
        </div>
      )}
    </div>
  );
}
