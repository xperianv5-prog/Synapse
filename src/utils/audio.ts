import { useState, useEffect } from 'react';

/**
 * Speech Recognition and Language Definition
 */

export interface SpeechLanguage {
  code: string;       // BCP 47 code for Web Speech API e.g. 'en-US'
  name: string;       // Display name e.g. 'English (US)'
  flag: string;       // Emoji flag
  nativeName: string; // e.g. 'Español'
}

export const SUPPORTED_SPEECH_LANGUAGES: SpeechLanguage[] = [
  { code: 'auto', name: 'Auto Detect', flag: '🌐', nativeName: 'Automatic' },
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸', nativeName: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧', nativeName: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'fr-FR', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'de-DE', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
  { code: 'zh-CN', name: 'Chinese (Mandarin)', flag: '🇨🇳', nativeName: '普通话' },
  { code: 'it-IT', name: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', flag: '🇧🇷', nativeName: 'Português' },
  { code: 'ko-KR', name: 'Korean', flag: '🇰🇷', nativeName: '한국어' },
  { code: 'ru-RU', name: 'Russian', flag: '🇷🇺', nativeName: 'Русский' },
  { code: 'ar-SA', name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
  { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳', nativeName: 'हिन्दी' },
  { code: 'nl-NL', name: 'Dutch', flag: '🇳🇱', nativeName: 'Nederlands' },
  { code: 'la', name: 'Latin (Anatomy/Law)', flag: '🏛️', nativeName: 'Latina' },
];

export interface AudioRecordingResult {
  blob: Blob;
  base64Data: string;
  duration: number; // in seconds
  mimeType: string;
}

export async function blobToBase64(blob: Blob, raw: boolean = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (raw) {
        const base64Index = result.indexOf(';base64,');
        if (base64Index !== -1) {
          resolve(result.substring(base64Index + 8));
        } else {
          resolve(result);
        }
      } else {
        resolve(result);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export class Recorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  async start(): Promise<void> {
    this.audioChunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Set up Web Audio API Analyser for real-time soundwave bar visualization
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.8;
        this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
        this.sourceNode.connect(this.analyser);
      }
    } catch (err) {
      console.warn('AudioContext / AnalyserNode setup warning:', err);
    }
    
    const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
    const selectedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
    
    this.mediaRecorder = selectedType
      ? new MediaRecorder(this.stream, { mimeType: selectedType })
      : new MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.startTime = Date.now();
    this.mediaRecorder.start(100);
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getByteFrequencyData(array: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array as any);
    }
  }

  async stop(): Promise<AudioRecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('Recorder not started'));
      }

      this.mediaRecorder.onstop = async () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const duration = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
        const base64Data = await blobToBase64(blob, false);

        this.cleanupAudioContext();

        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }

        resolve({
          blob,
          base64Data,
          duration,
          mimeType,
        });
      };

      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.cleanupAudioContext();
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  private cleanupAudioContext(): void {
    try {
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
        this.audioContext = null;
      }
      this.analyser = null;
    } catch (err) {
      console.warn('Error cleaning up audio context:', err);
    }
  }
}

// Global shared recorder instance to support persistent background recording across tabs
export const globalRecorder = new Recorder();

export interface GlobalRecordingState {
  isRecording: boolean;
  seconds: number;
  result: AudioRecordingResult | null;
  error: string | null;
}

type RecordingListener = (state: GlobalRecordingState) => void;

class AudioRecordingManager {
  private recorder = globalRecorder;
  private timer: any = null;
  private seconds = 0;
  private result: AudioRecordingResult | null = null;
  private error: string | null = null;
  private listeners = new Set<RecordingListener>();

  getRecorder(): Recorder {
    return this.recorder;
  }

  getState(): GlobalRecordingState {
    return {
      isRecording: this.recorder.isRecording(),
      seconds: this.seconds,
      result: this.result,
      error: this.error,
    };
  }

  subscribe(listener: RecordingListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const st = this.getState();
    this.listeners.forEach((fn) => fn(st));
  }

  async start(): Promise<void> {
    try {
      this.error = null;
      this.result = null;
      this.seconds = 0;
      await this.recorder.start();
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(() => {
        this.seconds += 1;
        this.notify();
      }, 1000);
      this.notify();
    } catch (err: any) {
      this.error = err.message || 'Microphone access denied';
      this.notify();
      throw err;
    }
  }

  async stop(): Promise<AudioRecordingResult> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const res = await this.recorder.stop();
    this.result = res;
    this.notify();
    return res;
  }

  cancel(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.recorder.cancel();
    this.seconds = 0;
    this.notify();
  }

  clearResult(): void {
    this.result = null;
    this.notify();
  }
}

export const recordingManager = new AudioRecordingManager();

export function useAudioRecording() {
  const [state, setState] = useState<GlobalRecordingState>(() => recordingManager.getState());

  useEffect(() => {
    return recordingManager.subscribe((newState) => {
      setState(newState);
    });
  }, []);

  return {
    ...state,
    recorder: recordingManager.getRecorder(),
    start: () => recordingManager.start(),
    stop: () => recordingManager.stop(),
    cancel: () => recordingManager.cancel(),
    clearResult: () => recordingManager.clearResult(),
  };
}

/**
 * Text-to-Speech: Attempts Gemini TTS first, falls back to Web Speech API
 */
export async function speakText(text: string, voiceName: string = 'Kore'): Promise<void> {
  if (!text) return;

  try {
    const res = await fetch('/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: voiceName }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.audioBase64) {
        const audioUrl = `data:audio/mp3;base64,${data.audioBase64}`;
        const audio = new Audio(audioUrl);
        await audio.play();
        return;
      }
    }
  } catch (err) {
    console.warn('Gemini TTS failed, falling back to browser Web Speech:', err);
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

export interface SpeechRecognitionOptions {
  language?: string; // e.g. 'en-US', 'es-ES', 'auto'
  continuous?: boolean;
  onInterim?: (interim: string) => void;
  onResult: (finalTranscript: string, recognizedLanguage?: string, confidence?: number) => void;
  onError?: (err: any) => void;
  onEnd?: () => void;
}

/**
 * High-precision Speech-to-Text with multi-language recognition
 */
export function startPreciseSpeechRecognition(
  options: SpeechRecognitionOptions
): { stop: () => void; recognition: any } | null {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = options.continuous ?? false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;

  const targetLang = (!options.language || options.language === 'auto')
    ? (navigator.language || 'en-US')
    : options.language;

  recognition.lang = targetLang;

  let accumulatedFinal = '';

  recognition.onresult = (event: any) => {
    let interim = '';
    let topConfidence = 0.95;

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const resultItem = event.results[i];
      if (resultItem.isFinal) {
        accumulatedFinal += (accumulatedFinal ? ' ' : '') + resultItem[0].transcript.trim();
        if (resultItem[0].confidence) {
          topConfidence = Math.max(topConfidence, resultItem[0].confidence);
        }
      } else {
        interim += resultItem[0].transcript;
      }
    }

    if (options.onInterim && interim) {
      options.onInterim(interim);
    }

    if (accumulatedFinal) {
      const detectedLangObj = SUPPORTED_SPEECH_LANGUAGES.find(l => l.code === targetLang);
      const detectedName = detectedLangObj ? detectedLangObj.name : targetLang;
      options.onResult(accumulatedFinal, detectedName, Math.round(topConfidence * 100));
    }
  };

  if (options.onError) {
    recognition.onerror = options.onError;
  }

  if (options.onEnd) {
    recognition.onend = options.onEnd;
  }

  try {
    recognition.start();
    return {
      recognition,
      stop: () => {
        try {
          recognition.stop();
        } catch (_) {}
      }
    };
  } catch (e) {
    if (options.onError) options.onError(e);
    return null;
  }
}

/**
 * Backward compatibility wrapper for simple startSpeechRecognition calls
 */
export function startSpeechRecognition(
  onResult: (transcript: string) => void,
  onError?: (err: any) => void,
  language: string = 'en-US'
): { stop: () => void } | null {
  const instance = startPreciseSpeechRecognition({
    language,
    onResult: (finalTranscript) => onResult(finalTranscript),
    onError,
  });

  return instance ? { stop: instance.stop } : null;
}

/**
 * Server-side High-Precision Gemini Transcribe with Automatic Language Identification
 */
export async function transcribeAudioWithGemini(
  audioBase64: string,
  mimeType: string = 'audio/webm',
  languageHint?: string
): Promise<{ transcript: string; detectedLanguage: string; confidence: number }> {
  const res = await fetch('/api/ai/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64,
      mimeType,
      languageHint: languageHint === 'auto' ? undefined : languageHint,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to transcribe audio.');
  }

  return {
    transcript: data.transcript || '',
    detectedLanguage: data.detectedLanguage || 'Detected Language',
    confidence: data.confidence || 98,
  };
}
