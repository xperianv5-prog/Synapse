import { useState, useRef, useEffect } from 'react';
import {
  Sparkles, Send, Upload, Mic, MicOff, Search, Globe, FileText,
  Trash2, Plus, Play, Pause, Square, RotateCw, Check, AlertCircle,
  ExternalLink, Layers, BookOpen, Volume2, ArrowRight, X, Clock,
  CheckCircle2, FileUp, ChevronDown, Cpu, Zap, Shield, HelpCircle, Loader2,
  Lock, RotateCcw, ChevronUp, ChevronRight
} from 'lucide-react';
import { Deck, Flashcard, StudyResource, ChatMessage, ProposedDeck, ProposedCard } from '../types';
import { Skin } from '../utils/skins';
import { useAudioRecording, AudioRecordingResult } from '../utils/audio';
import { extractTextFromPdf } from '../utils/pdf';
import { SoundwaveBar } from './SoundwaveBar';

interface AiStudioViewProps {
  decks: Deck[];
  resources: StudyResource[];
  onAddResource: (resource: StudyResource) => void;
  onRemoveResource: (resourceId: string) => void;
  onUpdateResource: (resource: StudyResource) => void;
  onAddCardsToDeck: (deckId: string, cards: Partial<Flashcard>[]) => void;
  onCreateDeckWithCards?: (title: string, category: string, cards: (Partial<Flashcard> | ProposedCard)[]) => void;
  activeSkin: Skin;
  showToast: (msg: string) => void;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  tier: 'Free' | 'Paid';
  latency: string;
  isDefault?: boolean;
}

const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'auto',
    name: 'Auto: Highest Availability & Lowest Latency',
    description: 'Automatically routes to the fastest free model (Gemini 3.8 Flash / 3.1 Flash-Lite)',
    tier: 'Free',
    latency: '< 450ms',
    isDefault: true,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    description: 'Ultra-low latency, highest availability for rapid Q&A and card drafts',
    tier: 'Free',
    latency: '~350ms',
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    description: 'High-speed cognitive reasoning, complex prompt answering & Google Search grounding',
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
    name: 'Gemini 3.1 Pro (Deep STEM Reasoning)',
    description: 'Intricate clinical reasoning and complex problem solving (Paid Account / Cloud key)',
    tier: 'Paid',
    latency: '~1.8s',
  },
];

export function AiStudioView({
  decks,
  resources,
  onAddResource,
  onRemoveResource,
  onUpdateResource,
  onAddCardsToDeck,
  onCreateDeckWithCards,
  activeSkin,
  showToast,
}: AiStudioViewProps) {
  // Navigation within AI Studio: 'chat' | 'resources' | 'recorder'
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'resources' | 'recorder'>('chat');

  // Model Selection
  const [selectedModel, setSelectedModel] = useState<string>('auto');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const CHAT_STORAGE_KEY = 'recall_ai_chat_messages_v2';

  // Chat & Prompt State with persistent localStorage
  const [promptInput, setPromptInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [activeContextResource, setActiveContextResource] = useState<StudyResource | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'welcome-msg',
        role: 'model',
        text: `Hello! I'm your **Recall AI** study assistant.

I can help you:
- **Analyze study materials & lecture recordings** from your **Resources Container**
- **Conduct live web searches** for current clinical guidelines and academic papers
- **Answer any questions** or break down difficult concepts into simple mental models
- **Generate high-yield spaced repetition flashcards** directly into your decks

Select an uploaded resource below, start an audio recording, or type a question to get started!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'Gemini 3.8 Flash',
      },
    ];
  });

  // Persistent storage of chat messages so tab changes never lose conversation
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages));
    } catch (err) {
      console.warn('Failed to persist chat messages:', err);
    }
  }, [chatMessages]);

  const handleClearChat = () => {
    const welcome: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'model',
      text: `Conversation cleared. What topic or study resource would you like to explore?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'Gemini 3.8 Flash',
    };
    setChatMessages([welcome]);
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {}
    showToast('Chat history cleared');
  };

  // Global Audio Recording hook (persists across tabs)
  const audioRecording = useAudioRecording();
  const [recordedAudio, setRecordedAudio] = useState<AudioRecordingResult | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptResult, setTranscriptResult] = useState<string | null>(null);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [recordingTitle, setRecordingTitle] = useState('');
  const [recorderError, setRecorderError] = useState<string | null>(null);

  // Sync global recording result when captured
  useEffect(() => {
    if (audioRecording.result) {
      setRecordedAudio(audioRecording.result);
    }
  }, [audioRecording.result]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Upload Material Modal / Drawer State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Make Cards Modal State
  const [makeCardsModalOpen, setMakeCardsModalOpen] = useState(false);
  const [resourceForCards, setResourceForCards] = useState<StudyResource | null>(null);
  const [targetDeckId, setTargetDeckId] = useState<string>(decks[0]?.id || 'new');
  const [cardCountToGenerate, setCardCountToGenerate] = useState<number>(8);
  const [cardStyleToGenerate, setCardStyleToGenerate] = useState<'conceptual' | 'definition' | 'cloze'>('conceptual');
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');

  // Auto-scroll chat on message addition
  useEffect(() => {
    if (activeSubTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeSubTab]);

  // Format recording timer seconds
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Handler for saving proposed deck from chat
  const handleSaveProposedDeck = (msgId: string, proposedDeck: ProposedDeck) => {
    if (!proposedDeck || !proposedDeck.cards || proposedDeck.cards.length === 0) return;
    if (onCreateDeckWithCards) {
      const formattedCards: ProposedCard[] = proposedDeck.cards.map(c => ({
        front: typeof c.front === 'string' ? c.front : (c.front as any)?.text || '',
        back: typeof c.back === 'string' ? c.back : (c.back as any)?.text || '',
        hint: c.hint,
        tags: c.tags || proposedDeck.tags || [],
      }));
      onCreateDeckWithCards(
        proposedDeck.title || 'AI Generated Deck',
        proposedDeck.category || 'General',
        formattedCards
      );
    }
    // Update msg in chat to reflect saved state
    setChatMessages(prev =>
      prev.map(m =>
        m.id === msgId && m.proposedDeck
          ? { ...m, proposedDeck: { ...m.proposedDeck, saved: true } }
          : m
      )
    );
    showToast(`Saved "${proposedDeck.title}" as Private deck`);
  };

  // -------------------------------------------------------------
  // Prompt & Chat Handling
  // -------------------------------------------------------------
  const handleSendPrompt = async (textToSend?: string) => {
    const text = (textToSend || promptInput).trim();
    if (!text || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      resourceId: activeContextResource?.id,
    };

    setChatMessages(prev => [...prev, userMsg]);
    setPromptInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          messages: chatMessages.slice(-6).map(m => ({ role: m.role, text: m.text })),
          resourceContext: activeContextResource?.content,
          enableSearch: enableWebSearch,
          model: selectedModel,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get response from AI');
      }

      const aiMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'model',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groundingSources: data.groundingSources,
        searchQueries: data.searchQueries,
        modelUsed: data.modelUsed,
        resourceId: activeContextResource?.id,
        proposedDeck: data.proposedDeck || undefined,
      };

      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'model',
        text: `⚠️ **Unable to complete response:** ${err.message || 'Please check your connection or switch models.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages(prev => [...prev, errorMsg]);
      showToast(err.message || 'AI request failed');
    } finally {
      setIsChatLoading(false);
    }
  };

  // -------------------------------------------------------------
  // File Upload Ingestion
  // -------------------------------------------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let extractedContent = '';
      let resourceType: StudyResource['type'] = 'document';

      if (file.type.includes('pdf') || file.name.endsWith('.pdf')) {
        resourceType = 'pdf';
        extractedContent = await extractTextFromPdf(file);
      } else if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        resourceType = 'text';
        extractedContent = await file.text();
      } else if (file.type.includes('audio') || file.name.match(/\.(mp3|wav|m4a|webm|ogg)$/i)) {
        resourceType = 'recording';
        extractedContent = `Audio file uploaded: ${file.name}. Click "Transcribe" to convert teacher or class recording to text.`;
      } else {
        resourceType = 'document';
        extractedContent = await file.text().catch(() => `Uploaded file: ${file.name}`);
      }

      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      const newResource: StudyResource = {
        id: `res-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        type: resourceType,
        content: extractedContent,
        fileSize: sizeStr,
        mimeType: file.type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [resourceType.toUpperCase(), 'Uploaded'],
      };

      onAddResource(newResource);
      showToast(`Added "${newResource.title}" to Resources container`);
      setActiveContextResource(newResource);
      setIsUploadModalOpen(false);
    } catch (err: any) {
      console.error('File upload error:', err);
      showToast(err.message || 'Failed to process file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveManualNote = () => {
    if (!manualContent.trim()) return;

    const title = manualTitle.trim() || `Class Note (${new Date().toLocaleDateString()})`;
    const newResource: StudyResource = {
      id: `res-${Date.now()}`,
      title,
      type: 'text',
      content: manualContent.trim(),
      fileSize: `${Math.round(manualContent.length / 1024) || 1} KB`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['Notes', 'Lecture'],
    };

    onAddResource(newResource);
    showToast(`Saved note "${newResource.title}" to Resources`);
    setActiveContextResource(newResource);
    setManualTitle('');
    setManualContent('');
    setIsUploadModalOpen(false);
  };

  // -------------------------------------------------------------
  // Audio Recorder Handling (Global background persistent)
  // -------------------------------------------------------------
  const handleStartRecording = async () => {
    setRecorderError(null);
    try {
      await audioRecording.start();
      setTranscriptResult(null);
      showToast('Recording started. You can freely navigate to any tab while recording!');
    } catch (err: any) {
      console.error('Recording start error:', err);
      setRecorderError(err.message || 'Microphone permission required to record audio.');
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await audioRecording.stop();
      setRecordedAudio(result);
      showToast('Audio clip captured! Ready to transcribe or save to resources.');
    } catch (err: any) {
      console.error('Recording stop error:', err);
      setRecorderError('Failed to capture audio.');
    }
  };

  const handleTranscribeAudio = async () => {
    if (!recordedAudio) return;
    setIsTranscribing(true);
    setRecorderError(null);

    try {
      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: recordedAudio.base64Data,
          mimeType: recordedAudio.mimeType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Transcription failed');
      }

      setTranscriptResult(data.transcript);
      setDetectedLang(data.detectedLanguage);
      showToast('Audio transcribed successfully');
    } catch (err: any) {
      console.error('Transcription error:', err);
      setRecorderError(err.message || 'Failed to transcribe audio.');
      showToast('Transcription failed');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSaveRecordingToResources = () => {
    if (!recordedAudio && !transcriptResult) return;

    const title = recordingTitle.trim() || `Lecture Recording (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    const content = transcriptResult || 'Lecture audio recorded in class. Click transcribe to generate full text.';

    const newResource: StudyResource = {
      id: `res-rec-${Date.now()}`,
      title,
      type: 'recording',
      content,
      fileData: recordedAudio ? `data:${recordedAudio.mimeType};base64,${recordedAudio.base64Data}` : undefined,
      durationSeconds: recordedAudio?.duration || audioRecording.seconds,
      mimeType: recordedAudio?.mimeType || 'audio/webm',
      isTranscribed: Boolean(transcriptResult),
      fileSize: recordedAudio ? `${Math.round(recordedAudio.base64Data.length * 0.75 / 1024)} KB` : 'Audio',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['Recording', 'Lecture', detectedLang || 'Audio'].filter(Boolean),
    };

    onAddResource(newResource);
    showToast(`Saved recording "${newResource.title}" to Resources container`);
    setActiveContextResource(newResource);
    setRecordedAudio(null);
    setTranscriptResult(null);
    setRecordingTitle('');
    setActiveSubTab('resources');
  };

  // -------------------------------------------------------------
  // Generate Structured Notes from Resource
  // -------------------------------------------------------------
  const handleGenerateNotesFromResource = async (resource: StudyResource) => {
    showToast(`Generating structured notes for "${resource.title}"...`);
    try {
      const res = await fetch('/api/ai/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: resource.content,
          title: resource.title,
          model: selectedModel,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate study notes');
      }

      const updated = {
        ...resource,
        notes: data.notes,
        updatedAt: new Date().toISOString(),
      };
      onUpdateResource(updated);
      showToast('Structured study notes generated!');

      // Also append to chat for reading
      const notesMsg: ChatMessage = {
        id: `notes-${Date.now()}`,
        role: 'model',
        text: `Here are your high-yield study notes for **${resource.title}**:\n\n${data.notes}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed,
        resourceId: resource.id,
      };
      setChatMessages(prev => [...prev, notesMsg]);
      setActiveSubTab('chat');
    } catch (err: any) {
      console.error('Notes generation error:', err);
      showToast(err.message || 'Error generating notes');
    }
  };

  // -------------------------------------------------------------
  // Generate Cards from Resource into Deck
  // -------------------------------------------------------------
  const handleStartMakeCards = (resource: StudyResource) => {
    setResourceForCards(resource);
    setTargetDeckId(decks[0]?.id || 'new');
    setNewDeckTitle(`${resource.title} Deck`);
    setMakeCardsModalOpen(true);
  };

  const handleConfirmGenerateCards = async () => {
    if (!resourceForCards) return;
    setIsGeneratingCards(true);

    try {
      const res = await fetch('/api/ai/generate-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: resourceForCards.content,
          topic: resourceForCards.title,
          count: cardCountToGenerate,
          cardStyle: cardStyleToGenerate,
          model: selectedModel,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.cards || data.cards.length === 0) {
        throw new Error(data.error || 'Failed to generate cards');
      }

      if (targetDeckId === 'new') {
        const titleToUse = newDeckTitle.trim() || `${resourceForCards.title} Flashcards`;
        if (onCreateDeckWithCards) {
          onCreateDeckWithCards(titleToUse, 'AI Study', data.cards);
        } else if (decks[0]) {
          onAddCardsToDeck(decks[0].id, data.cards);
        }
      } else {
        onAddCardsToDeck(targetDeckId, data.cards);
      }

      showToast(`Created ${data.cards.length} cards from "${resourceForCards.title}"`);
      setMakeCardsModalOpen(false);
      setResourceForCards(null);
    } catch (err: any) {
      console.error('Make cards error:', err);
      showToast(err.message || 'Card generation failed');
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const activeModelObj = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];

  return (
    <div className="space-y-4 max-w-3xl mx-auto px-4 py-3 pb-28 select-none animate-in fade-in duration-200">
      
      {/* --------------------------------------------------------- */}
      {/* Unified AI Studio Container */}
      {/* --------------------------------------------------------- */}
      <div
        className="rounded-3xl border shadow-2xl transition-all overflow-hidden"
        style={{
          backgroundColor: activeSkin.colors.surface,
          borderColor: activeSkin.colors.border,
          boxShadow: `0 8px 30px -10px ${activeSkin.colors.accentGlow}`,
        }}
      >
        {/* Header content moved inside */}
        <div className="p-3.5 sm:p-4 space-y-3 border-b" style={{ borderColor: activeSkin.colors.border }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shadow-sm"
                  style={{
                    backgroundColor: activeSkin.colors.accent,
                    color: activeSkin.colors.accentText,
                    boxShadow: `0 2px 10px ${activeSkin.colors.accentGlow}`,
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <h1 className="text-base sm:text-lg font-black tracking-tight" style={{ color: activeSkin.colors.textPrimary }}>
                  AI Studio & Study Resources
                </h1>
              </div>
              <p className="text-xs mt-0.5" style={{ color: activeSkin.colors.textSecondary }}>
                Prompt AI, upload lecture materials, transcribe classroom recordings & generate cards
              </p>
            </div>

            {/* Model Status Pill & Selector */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="px-3 py-1.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-xs"
                style={{
                  backgroundColor: activeSkin.colors.surfaceHover,
                  borderColor: isModelDropdownOpen ? activeSkin.colors.accent : activeSkin.colors.border,
                  color: activeSkin.colors.textPrimary,
                }}
                title="Select LLM model or auto-connect to lowest latency"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="text-left">
                  <span className="block text-[11px] font-bold leading-tight truncate max-w-[170px] sm:max-w-[210px]">
                    {activeModelObj.id === 'auto' ? 'Auto (Lowest Latency)' : activeModelObj.name}
                  </span>
                  <span className="block text-[9px] font-mono leading-tight" style={{ color: activeSkin.colors.textMuted }}>
                    {activeModelObj.latency} · {activeModelObj.tier}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
              </button>

              {/* Model Selector Dropdown */}
              {isModelDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl border shadow-2xl p-2 z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150"
                  style={{
                    backgroundColor: activeSkin.colors.surface,
                    borderColor: activeSkin.colors.border,
                  }}
                >
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider" style={{ color: activeSkin.colors.textMuted }}>
                    AI Model Connection
                  </div>
                  {AVAILABLE_MODELS.map(m => {
                    const isSelected = selectedModel === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m.id);
                          setIsModelDropdownOpen(false);
                          showToast(`Connected to ${m.name}`);
                        }}
                        className="p-2 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-2 border"
                        style={{
                          backgroundColor: isSelected ? `${activeSkin.colors.accent}18` : activeSkin.colors.surfaceHover,
                          borderColor: isSelected ? activeSkin.colors.accent : 'transparent',
                          color: activeSkin.colors.textPrimary,
                        }}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold leading-tight">{m.name}</span>
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.2 rounded-md"
                              style={{
                                backgroundColor: m.tier === 'Free' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                color: m.tier === 'Free' ? '#34d399' : '#818cf8',
                              }}
                            >
                              {m.tier}
                            </span>
                          </div>
                          <p className="text-[10px] line-clamp-1 mt-0.5" style={{ color: activeSkin.colors.textSecondary }}>
                            {m.description}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono shrink-0 font-semibold" style={{ color: activeSkin.colors.accent }}>
                          {m.latency}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sub-navigation Pills */}
          <div className="flex items-center gap-1.5 border-t pt-2.5" style={{ borderColor: activeSkin.colors.border }}>
            <button
              type="button"
              onClick={() => setActiveSubTab('chat')}
              className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              style={{
                backgroundColor: activeSubTab === 'chat' ? activeSkin.colors.accent : activeSkin.colors.surfaceHover,
                color: activeSubTab === 'chat' ? activeSkin.colors.accentText : activeSkin.colors.textSecondary,
                boxShadow: activeSubTab === 'chat' ? `0 2px 10px ${activeSkin.colors.accentGlow}` : 'none',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Assistant & Chat</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('resources')}
              className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all relative"
              style={{
                backgroundColor: activeSubTab === 'resources' ? activeSkin.colors.accent : activeSkin.colors.surfaceHover,
                color: activeSubTab === 'resources' ? activeSkin.colors.accentText : activeSkin.colors.textSecondary,
                boxShadow: activeSubTab === 'resources' ? `0 2px 10px ${activeSkin.colors.accentGlow}` : 'none',
              }}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Resources ({resources.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('recorder')}
              className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all relative"
              style={{
                backgroundColor: activeSubTab === 'recorder' ? activeSkin.colors.accent : activeSkin.colors.surfaceHover,
                color: activeSubTab === 'recorder' ? activeSkin.colors.accentText : activeSkin.colors.textSecondary,
                boxShadow: activeSubTab === 'recorder' ? `0 2px 10px ${activeSkin.colors.accentGlow}` : 'none',
              }}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Recorder</span>
              {audioRecording.isRecording && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab content wrapper */}
        <div className="p-3.5 sm:p-4">
          {activeSubTab === 'chat' && (
            <div className="space-y-3">
              {/* Active Context Banner if resource is selected */}
              {activeContextResource && (
                <div
                  className="p-2.5 rounded-2xl border flex items-center justify-between gap-2 text-xs animate-in fade-in"
                  style={{
                    backgroundColor: `${activeSkin.colors.accent}15`,
                    borderColor: `${activeSkin.colors.accent}40`,
                    color: activeSkin.colors.textPrimary,
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 shrink-0" style={{ color: activeSkin.colors.accent }} />
                    <span className="truncate">
                      Active Reference Context: <strong style={{ color: activeSkin.colors.accent }}>{activeContextResource.title}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveContextResource(null)}
                    className="p-1 rounded-lg hover:opacity-75 transition-opacity"
                    title="Detach context"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Chat Thread Header Bar with Persistent Indicator & Clear Button */}
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-semibold text-[11px] flex items-center gap-1.5" style={{ color: activeSkin.colors.textMuted }}>
                  <span>Persistent Chat Thread</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>({chatMessages.length} {chatMessages.length === 1 ? 'msg' : 'msgs'})</span>
                </span>
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="px-2 py-0.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1 hover:text-rose-400 hover:border-rose-400/40 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: activeSkin.colors.surfaceHover,
                    borderColor: activeSkin.colors.border,
                    color: activeSkin.colors.textMuted,
                  }}
                  title="Clear chat conversation"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Chat</span>
                </button>
              </div>

              {/* Chat Messages Thread */}
              <div
                className="border rounded-3xl p-4 sm:p-5 space-y-4 min-h-[300px] max-h-[460px] overflow-y-auto shadow-inner transition-colors"
                style={{
                  backgroundColor: activeSkin.colors.surfaceHover,
                  borderColor: activeSkin.colors.border,
                }}
              >
                {chatMessages.map(msg => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1 text-xs`}
                    >
                      <div className="flex items-center gap-1.5 px-1 text-[10px]" style={{ color: activeSkin.colors.textMuted }}>
                        <span>{isUser ? 'You' : 'Recall AI'}</span>
                        <span>·</span>
                        <span>{msg.timestamp}</span>
                        {msg.modelUsed && !isUser && (
                          <span className="font-mono text-[9px] px-1.5 rounded-md bg-white/5 border border-white/10">
                            {msg.modelUsed}
                          </span>
                        )}
                      </div>

                      <div
                        className={`p-3.5 sm:p-4 rounded-2xl max-w-[92%] sm:max-w-[85%] whitespace-pre-wrap leading-relaxed shadow-sm border ${
                          isUser ? 'rounded-tr-xs' : 'rounded-tl-xs'
                        }`}
                        style={{
                          backgroundColor: isUser ? activeSkin.colors.accent : activeSkin.colors.surface,
                          color: isUser ? activeSkin.colors.accentText : activeSkin.colors.textPrimary,
                          borderColor: isUser ? activeSkin.colors.accent : activeSkin.colors.border,
                        }}
                      >
                        {msg.text}

                        {/* Interactive Proposed Flashcard Deck Card */}
                        {msg.proposedDeck && (
                          <div
                            className="mt-3.5 p-3.5 rounded-2xl border space-y-2.5 shadow-md text-xs animate-in fade-in"
                            style={{
                              backgroundColor: `${activeSkin.colors.surfaceHover}ee`,
                              borderColor: `${activeSkin.colors.accent}45`,
                            }}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shadow-xs"
                                  style={{
                                    backgroundColor: activeSkin.colors.accent,
                                    color: activeSkin.colors.accentText,
                                  }}
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-xs" style={{ color: activeSkin.colors.textPrimary }}>
                                    {msg.proposedDeck.title}
                                  </h4>
                                  <span className="text-[10px] opacity-80" style={{ color: activeSkin.colors.textMuted }}>
                                    {msg.proposedDeck.category} · {msg.proposedDeck.cards.length} cards
                                  </span>
                                </div>
                              </div>

                              {/* Default Private Indicator */}
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1"
                                style={{
                                  backgroundColor: 'rgba(148, 163, 184, 0.12)',
                                  borderColor: 'rgba(148, 163, 184, 0.25)',
                                  color: activeSkin.colors.textMuted,
                                }}
                                title="Decks you create or generate are private by default"
                              >
                                <Lock className="w-2.5 h-2.5 text-slate-400" />
                                <span>Private Deck (Default)</span>
                              </span>
                            </div>

                            {msg.proposedDeck.description && (
                              <p className="text-[11px] leading-relaxed" style={{ color: activeSkin.colors.textSecondary }}>
                                {msg.proposedDeck.description}
                              </p>
                            )}

                            {/* Expandable Preview of Cards */}
                            <div className="space-y-1.5 pt-1">
                              <div className="text-[10px] font-bold uppercase tracking-wider opacity-75" style={{ color: activeSkin.colors.textMuted }}>
                                Flashcards Preview ({msg.proposedDeck.cards.length})
                              </div>
                              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                {msg.proposedDeck.cards.map((c, cIdx) => (
                                  <div
                                    key={cIdx}
                                    className="p-2 rounded-xl border text-[11px] space-y-0.5"
                                    style={{
                                      backgroundColor: activeSkin.colors.surface,
                                      borderColor: activeSkin.colors.border,
                                    }}
                                  >
                                    <div className="font-semibold" style={{ color: activeSkin.colors.textPrimary }}>
                                      <span className="text-[10px] font-mono opacity-60 mr-1">Q{cIdx + 1}:</span>
                                      {c.front}
                                    </div>
                                    <div className="opacity-90 pl-3 border-l-2" style={{ borderColor: activeSkin.colors.accent, color: activeSkin.colors.textSecondary }}>
                                      {c.back}
                                    </div>
                                    {c.hint && (
                                      <div className="text-[10px] italic opacity-75 pl-3">
                                        💡 {c.hint}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Propose Saving to Decks Action */}
                            <div className="pt-2 border-t flex items-center justify-between gap-2 flex-wrap" style={{ borderColor: activeSkin.colors.border }}>
                              <span className="text-[10px] opacity-75 italic" style={{ color: activeSkin.colors.textMuted }}>
                                Save to your personal decks library
                              </span>

                              {msg.proposedDeck.saved ? (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  <span>Saved to My Decks!</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSaveProposedDeck(msg.id, msg.proposedDeck!)}
                                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                                  style={{
                                    backgroundColor: activeSkin.colors.accent,
                                    color: activeSkin.colors.accentText,
                                    boxShadow: `0 2px 10px ${activeSkin.colors.accentGlow}`,
                                  }}
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Save to My Decks</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Online Search Grounding Sources */}
                        {msg.groundingSources && msg.groundingSources.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1 text-[11px]">
                            <span className="font-bold flex items-center gap-1 opacity-80">
                              <Globe className="w-3 h-3 text-cyan-400" /> Web Sources & Citations:
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {msg.groundingSources.map((src, sIdx) => (
                                <a
                                  key={sIdx}
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-0.5 rounded-lg border text-[10px] flex items-center gap-1 hover:underline transition-opacity bg-black/20 border-white/15"
                                >
                                  <span className="truncate max-w-[160px]">{src.title}</span>
                                  <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isChatLoading && (
                  <div className="flex items-center gap-2 p-3 rounded-2xl text-xs" style={{ color: activeSkin.colors.accent }}>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="font-semibold animate-pulse">Recall AI is reasoning & checking resources...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Floating Modern Composer with Embedded Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* Template Prompt Chips Carousel above Composer */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleSendPrompt("Generate a high-yield 8-flashcard deck covering core concepts with front questions, definitive back answers, and memory hints.")}
                    className="px-2.5 py-1 rounded-full border shrink-0 transition-all active:scale-95 flex items-center gap-1 font-semibold hover:border-indigo-400 shadow-xs cursor-pointer"
                    style={{
                      backgroundColor: activeSkin.colors.surface,
                      borderColor: activeSkin.colors.border,
                      color: activeSkin.colors.textPrimary,
                    }}
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Generate 8-card Deck</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendPrompt("Summarize key definitions, formulas, and high-yield study takeaways from our session.")}
                    className="px-2.5 py-1 rounded-full border shrink-0 transition-all active:scale-95 flex items-center gap-1 font-semibold hover:border-indigo-400 shadow-xs cursor-pointer"
                    style={{
                      backgroundColor: activeSkin.colors.surface,
                      borderColor: activeSkin.colors.border,
                      color: activeSkin.colors.textPrimary,
                    }}
                  >
                    <FileText className="w-3 h-3 text-indigo-400" />
                    <span>High-Yield Summary</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendPrompt("Explain this concept simply using intuitive mental models (ELI5).")}
                    className="px-2.5 py-1 rounded-full border shrink-0 transition-all active:scale-95 flex items-center gap-1 font-semibold hover:border-indigo-400 shadow-xs cursor-pointer"
                    style={{
                      backgroundColor: activeSkin.colors.surface,
                      borderColor: activeSkin.colors.border,
                      color: activeSkin.colors.textPrimary,
                    }}
                  >
                    <HelpCircle className="w-3 h-3 text-cyan-400" />
                    <span>Explain Simply (ELI5)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEnableWebSearch(true);
                      handleSendPrompt("Search current academic and clinical research for updated guidelines on this topic.");
                    }}
                    className="px-2.5 py-1 rounded-full border shrink-0 transition-all active:scale-95 flex items-center gap-1 font-semibold hover:border-indigo-400 shadow-xs cursor-pointer"
                    style={{
                      backgroundColor: activeSkin.colors.surface,
                      borderColor: activeSkin.colors.border,
                      color: activeSkin.colors.textPrimary,
                    }}
                  >
                    <Globe className="w-3 h-3 text-emerald-400" />
                    <span>Search Literature</span>
                  </button>
                </div>

                {/* Floating Elevated Modern Composer Dock */}
                <div
                  className="p-3 sm:p-3.5 rounded-3xl border shadow-2xl space-y-2.5 transition-all backdrop-blur-xl"
                  style={{
                    backgroundColor: activeSkin.colors.surface,
                    borderColor: activeSkin.colors.border,
                    boxShadow: `0 12px 35px -8px ${activeSkin.colors.accentGlow}`,
                  }}
                >
                  {/* Embedded Action Controls Bar */}
                  <div className="flex items-center justify-between gap-2 text-xs px-0.5 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Quick Deck Trigger Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const topic = activeContextResource?.title || 'Current Topic';
                          handleSendPrompt(`Create a 8-card flashcard deck for ${topic} with concise front prompts, definitive answers, and memory hints.`);
                        }}
                        className="px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                        style={{
                          backgroundColor: `${activeSkin.colors.accent}15`,
                          borderColor: `${activeSkin.colors.accent}40`,
                          color: activeSkin.colors.accent,
                        }}
                        title="Ask AI to generate a full flashcard deck and propose saving it"
                      >
                        <Layers className="w-3 h-3" />
                        <span>Quick Deck</span>
                      </button>

                      {/* Audio Voice Input / Microphone Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (audioRecording.isRecording) {
                            handleStopRecording();
                          } else {
                            handleStartRecording();
                          }
                        }}
                        className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                          audioRecording.isRecording ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' : ''
                        }`}
                        style={
                          audioRecording.isRecording
                            ? {}
                            : {
                                backgroundColor: activeSkin.colors.surfaceHover,
                                borderColor: activeSkin.colors.border,
                                color: activeSkin.colors.textSecondary,
                              }
                        }
                        title={audioRecording.isRecording ? 'Stop Voice Recording' : 'Record Voice Audio'}
                      >
                        <Mic className="w-3 h-3 text-rose-400" />
                        <span>{audioRecording.isRecording ? `Recording (${formatTime(audioRecording.seconds)})` : 'Voice'}</span>
                      </button>

                      {/* Online Search Grounding Toggle */}
                      <button
                        type="button"
                        onClick={() => setEnableWebSearch(!enableWebSearch)}
                        className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                          enableWebSearch ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs' : ''
                        }`}
                        style={
                          enableWebSearch
                            ? {}
                            : {
                                backgroundColor: activeSkin.colors.surfaceHover,
                                borderColor: activeSkin.colors.border,
                                color: activeSkin.colors.textSecondary,
                              }
                        }
                        title="Toggle live Google Search grounding"
                      >
                        <Globe className="w-3 h-3 text-cyan-400" />
                        <span>Search {enableWebSearch ? 'On' : 'Off'}</span>
                      </button>
                    </div>

                    {/* Upload Material Shortcut */}
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(true)}
                      className="text-[11px] font-semibold flex items-center gap-1 hover:underline ml-auto cursor-pointer"
                      style={{ color: activeSkin.colors.accent }}
                    >
                      <FileUp className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </button>
                  </div>

                  {/* Text Input Row */}
                  <div className="flex items-end gap-2">
                    <textarea
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendPrompt();
                        }
                      }}
                      placeholder={
                        activeContextResource
                          ? `Ask about "${activeContextResource.title}" or ask to generate cards...`
                          : "Write prompt, ask questions, or type 'Make a deck on cardiology'..."
                      }
                      rows={2}
                      className="flex-1 border rounded-2xl px-3.5 py-2.5 text-xs focus:outline-none transition-all resize-none"
                      style={{
                        backgroundColor: activeSkin.colors.surfaceHover,
                        borderColor: activeSkin.colors.border,
                        color: activeSkin.colors.textPrimary,
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => handleSendPrompt()}
                      disabled={isChatLoading || !promptInput.trim()}
                      className="p-3 disabled:opacity-40 text-xs font-bold rounded-2xl shadow-md flex items-center justify-center transition-all active:scale-95 shrink-0 cursor-pointer"
                      style={{
                        backgroundColor: activeSkin.colors.accent,
                        color: activeSkin.colors.accentText,
                        boxShadow: `0 3px 12px ${activeSkin.colors.accentGlow}`,
                      }}
                      title={isChatLoading ? "Thinking..." : "Send Prompt (Enter)"}
                    >
                      {isChatLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* TAB 2: RESOURCES CONTAINER */}
      {/* --------------------------------------------------------- */}
          {activeSubTab === 'resources' && (
            <div className="space-y-4">
              
              {/* Resources Container Top Actions */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: activeSkin.colors.textPrimary }}>
                    📦 Resources Container ({resources.length})
                  </h2>
                  <p className="text-[11px]" style={{ color: activeSkin.colors.textSecondary }}>
                    All saved PDFs, classroom recordings, lecture notes & study documents
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-bold rounded-2xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                  style={{
                    backgroundColor: activeSkin.colors.accent,
                    color: activeSkin.colors.accentText,
                    boxShadow: `0 3px 12px ${activeSkin.colors.accentGlow}`,
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Material</span>
                </button>
              </div>

              {/* Resources Grid / Cards */}
              {resources.length === 0 ? (
                <div
                  className="text-center py-12 border rounded-3xl p-6 transition-all"
                  style={{
                    backgroundColor: activeSkin.colors.surfaceHover,
                    borderColor: activeSkin.colors.border,
                  }}
                >
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" style={{ color: activeSkin.colors.accent }} />
                  <h3 className="text-sm font-bold" style={{ color: activeSkin.colors.textPrimary }}>
                    No Resources in Container Yet
                  </h3>
                  <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: activeSkin.colors.textSecondary }}>
                    Upload PDFs, paste lecture notes, or record classroom audio to build your active study library.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(true)}
                    className="mt-4 px-4 py-2 text-xs font-bold rounded-xl border shadow-sm transition-all"
                    style={{
                      backgroundColor: activeSkin.colors.surface,
                      borderColor: activeSkin.colors.border,
                      color: activeSkin.colors.accent,
                    }}
                  >
                    Upload First Document
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {resources.map(res => {
                    const isSelectedForChat = activeContextResource?.id === res.id;

                    return (
                      <div
                        key={res.id}
                        className="border rounded-2xl p-4 transition-all hover:shadow-lg space-y-3"
                        style={{
                          backgroundColor: isSelectedForChat ? `${activeSkin.colors.accent}12` : activeSkin.colors.surfaceHover,
                          borderColor: isSelectedForChat ? activeSkin.colors.accent : activeSkin.colors.border,
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs mt-0.5"
                              style={{
                                backgroundColor: res.type === 'recording'
                                  ? 'rgba(168, 85, 247, 0.2)'
                                  : res.type === 'pdf'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : 'rgba(59, 130, 246, 0.2)',
                                color: res.type === 'recording'
                                  ? '#c084fc'
                                  : res.type === 'pdf'
                                  ? '#f87171'
                                  : '#60a5fa',
                              }}
                            >
                              {res.type === 'recording' ? (
                                <Mic className="w-4 h-4" />
                              ) : res.type === 'pdf' ? (
                                <FileText className="w-4 h-4" />
                              ) : (
                                <BookOpen className="w-4 h-4" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <h3 className="text-xs sm:text-sm font-bold truncate leading-tight" style={{ color: activeSkin.colors.textPrimary }}>
                                {res.title}
                              </h3>
                              <div className="flex items-center gap-2 text-[10px] mt-1" style={{ color: activeSkin.colors.textMuted }}>
                                <span className="uppercase font-mono font-bold">{res.type}</span>
                                {res.fileSize && <span>· {res.fileSize}</span>}
                                {res.durationSeconds && <span>· {formatTime(res.durationSeconds)}</span>}
                                <span>· {new Date(res.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => {
                              onRemoveResource(res.id);
                              if (activeContextResource?.id === res.id) setActiveContextResource(null);
                              showToast(`Removed "${res.title}" from Resources`);
                            }}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                            title="Remove from Resources Container"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Excerpt preview */}
                        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: activeSkin.colors.textSecondary }}>
                          {res.content}
                        </p>

                        {/* Action Buttons for this Resource */}
                        <div className="flex items-center gap-2 flex-wrap pt-1 border-t" style={{ borderColor: activeSkin.colors.border }}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveContextResource(res);
                              setActiveSubTab('chat');
                              showToast(`Selected "${res.title}" as active AI context`);
                            }}
                            className="px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95"
                            style={{
                              backgroundColor: isSelectedForChat ? activeSkin.colors.accent : activeSkin.colors.surface,
                              color: isSelectedForChat ? activeSkin.colors.accentText : activeSkin.colors.textPrimary,
                              borderColor: isSelectedForChat ? activeSkin.colors.accent : activeSkin.colors.border,
                            }}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{isSelectedForChat ? 'Active in Chat' : 'Chat with AI'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartMakeCards(res)}
                            className="px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95"
                            style={{
                              backgroundColor: activeSkin.colors.surface,
                              borderColor: activeSkin.colors.border,
                              color: activeSkin.colors.accent,
                            }}
                          >
                            <Layers className="w-3 h-3" />
                            <span>Make Cards</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleGenerateNotesFromResource(res)}
                            className="px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95"
                            style={{
                              backgroundColor: activeSkin.colors.surface,
                              borderColor: activeSkin.colors.border,
                              color: activeSkin.colors.textSecondary,
                            }}
                          >
                            <FileText className="w-3 h-3" />
                            <span>Study Notes</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'recorder' && (
            <div
              className="space-y-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-rose-400" />
                  <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: activeSkin.colors.textPrimary }}>
                    Recorder
                  </h2>
                </div>
                <p className="text-xs mt-0.5" style={{ color: activeSkin.colors.textSecondary }}>
                  Record lectures, study sessions, or vocal explanations with real-time soundwave visualization. Even while recording, you can freely switch tabs and study cards!
                </p>
              </div>

              {/* Recorder Widget Controls with Live Soundwave Bar */}
              <div
                className="p-6 rounded-2xl border flex flex-col items-center justify-center text-center space-y-4 transition-all"
                style={{
                  backgroundColor: audioRecording.isRecording ? 'rgba(239, 68, 68, 0.08)' : activeSkin.colors.surfaceHover,
                  borderColor: audioRecording.isRecording ? '#ef4444' : activeSkin.colors.border,
                }}
              >
                {/* Live Timer & Wave Visualizer Bar */}
                <div className="space-y-2 w-full max-w-md">
                  <span
                    className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                      audioRecording.isRecording ? 'text-rose-500 animate-pulse' : ''
                    }`}
                    style={{ color: audioRecording.isRecording ? undefined : activeSkin.colors.textPrimary }}
                  >
                    {formatTime(audioRecording.seconds)}
                  </span>

                  {/* Real-Time Soundwave Bar Visualizer */}
                  <div className="py-1">
                    <SoundwaveBar
                      isRecording={audioRecording.isRecording}
                      recorder={audioRecording.recorder}
                      barCount={32}
                      height={48}
                      activeColor={activeSkin.colors.accent}
                    />
                  </div>

                  <p className="text-[11px] font-semibold" style={{ color: activeSkin.colors.textMuted }}>
                    {audioRecording.isRecording ? (
                      <span className="flex items-center justify-center gap-1.5 text-rose-400">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                        Live Recording Active · Feel free to study other tabs while recording continues!
                      </span>
                    ) : (
                      'Ready to record audio'
                    )}
                  </p>
                </div>

                {/* Big Record & Control Buttons */}
                <div className="flex items-center gap-3">
                  {!audioRecording.isRecording ? (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="px-6 py-3 rounded-2xl text-xs font-black shadow-lg flex items-center gap-2 transition-all active:scale-95 bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Start Recording</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleStopRecording}
                        className="px-6 py-3 rounded-2xl text-xs font-black shadow-lg flex items-center gap-2 transition-all active:scale-95 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-rose-400 cursor-pointer"
                      >
                        <Square className="w-4 h-4 fill-rose-400" />
                        <span>Stop Recording</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          audioRecording.cancel();
                          showToast('Recording cancelled');
                        }}
                        className="px-4 py-3 rounded-2xl text-xs font-bold border hover:bg-white/5 transition-all text-slate-400 cursor-pointer"
                        style={{ borderColor: activeSkin.colors.border }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {recorderError && (
                  <p className="text-xs text-rose-400 font-semibold">{recorderError}</p>
                )}
              </div>

              {/* Captured Audio Result Actions */}
              {recordedAudio && (
                <div
                  className="p-4 rounded-2xl border space-y-3 animate-in fade-in"
                  style={{
                    backgroundColor: activeSkin.colors.surfaceHover,
                    borderColor: activeSkin.colors.border,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: activeSkin.colors.textPrimary }}>
                      Captured Clip ({formatTime(recordedAudio.duration)})
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Audio Ready</span>
                  </div>

                  <input
                    type="text"
                    placeholder="Give this recording a title (e.g. Cardiology Lecture Pt. 2)..."
                    value={recordingTitle}
                    onChange={(e) => setRecordingTitle(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                    style={{
                      backgroundColor: activeSkin.colors.surface,
                      borderColor: activeSkin.colors.border,
                      color: activeSkin.colors.textPrimary,
                    }}
                  />

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleTranscribeAudio}
                      disabled={isTranscribing}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      style={{
                        backgroundColor: activeSkin.colors.accent,
                        color: activeSkin.colors.accentText,
                      }}
                    >
                      {isTranscribing ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Transcribing Lecture...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Transcribe with AI</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveRecordingToResources}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                      style={{
                        backgroundColor: activeSkin.colors.surface,
                        borderColor: activeSkin.colors.border,
                        color: activeSkin.colors.textPrimary,
                      }}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save to Resources</span>
                    </button>
                  </div>

                  {/* Transcript Display */}
                  {transcriptResult && (
                    <div className="mt-3 p-3 rounded-xl bg-black/25 border border-white/10 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-400">Verbatim Classroom Transcript:</span>
                        {detectedLang && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                            {detectedLang}
                          </span>
                        )}
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto" style={{ color: activeSkin.colors.textPrimary }}>
                        {transcriptResult}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            const resObj: StudyResource = {
                              id: `res-rec-${Date.now()}`,
                              title: recordingTitle.trim() || `Class Lecture (${new Date().toLocaleDateString()})`,
                              type: 'recording',
                              content: transcriptResult,
                              fileData: recordedAudio ? `data:${recordedAudio.mimeType};base64,${recordedAudio.base64Data}` : undefined,
                              durationSeconds: recordedAudio?.duration || audioRecording.seconds,
                              isTranscribed: true,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                              tags: ['Recording', 'Lecture', detectedLang || 'Classroom'],
                            };
                            onAddResource(resObj);
                            handleStartMakeCards(resObj);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                          style={{
                            backgroundColor: activeSkin.colors.accent,
                            color: activeSkin.colors.accentText,
                          }}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Make Cards from Transcript</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const resObj: StudyResource = {
                              id: `res-rec-${Date.now()}`,
                              title: recordingTitle.trim() || `Class Lecture (${new Date().toLocaleDateString()})`,
                              type: 'recording',
                              content: transcriptResult,
                              fileData: recordedAudio ? `data:${recordedAudio.mimeType};base64,${recordedAudio.base64Data}` : undefined,
                              durationSeconds: recordedAudio?.duration || audioRecording.seconds,
                              isTranscribed: true,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                              tags: ['Recording', 'Lecture', detectedLang || 'Classroom'],
                            };
                            onAddResource(resObj);
                            handleGenerateNotesFromResource(resObj);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                          style={{
                            backgroundColor: activeSkin.colors.surface,
                            borderColor: activeSkin.colors.border,
                            color: activeSkin.colors.textPrimary,
                          }}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Make Notes from Transcript</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

      {/* --------------------------------------------------------- */}
      {/* MODAL: UPLOAD OR PASTE NEW MATERIAL INTO RESOURCES */}
      {/* --------------------------------------------------------- */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div
            className="border w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4"
            style={{
              backgroundColor: activeSkin.colors.surface,
              borderColor: activeSkin.colors.border,
              color: activeSkin.colors.textPrimary,
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FileUp className="w-4 h-4" style={{ color: activeSkin.colors.accent }} />
                Add Material to Resources Container
              </h3>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg hover:opacity-75"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* File Upload Trigger */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-5 border-2 border-dashed rounded-2xl text-center cursor-pointer hover:border-indigo-400 transition-colors"
              style={{
                backgroundColor: activeSkin.colors.surfaceHover,
                borderColor: activeSkin.colors.border,
              }}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 opacity-60" style={{ color: activeSkin.colors.accent }} />
              <span className="text-xs font-bold block" style={{ color: activeSkin.colors.textPrimary }}>
                {isUploading ? 'Extracting document text...' : 'Click to Upload PDF, Document, or Audio File'}
              </span>
              <span className="text-[10px] block mt-1" style={{ color: activeSkin.colors.textMuted }}>
                Supports PDF, DOC, TXT, MD, MP3, WAV, WebM
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.doc,.docx,.mp3,.wav,.m4a,.webm"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t" style={{ borderColor: activeSkin.colors.border }}></div>
              <span className="flex-shrink mx-3 text-[10px] font-bold uppercase" style={{ color: activeSkin.colors.textMuted }}>
                Or Paste Lecture Text / Note
              </span>
              <div className="flex-grow border-t" style={{ borderColor: activeSkin.colors.border }}></div>
            </div>

            {/* Manual Text Input */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Resource title (e.g. Chapter 4 Lecture Notes)..."
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                style={{
                  backgroundColor: activeSkin.colors.surfaceHover,
                  borderColor: activeSkin.colors.border,
                  color: activeSkin.colors.textPrimary,
                }}
              />

              <textarea
                placeholder="Paste textbook excerpts, professor notes, syllabus, or medical cases here..."
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                rows={4}
                className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none resize-none"
                style={{
                  backgroundColor: activeSkin.colors.surfaceHover,
                  borderColor: activeSkin.colors.border,
                  color: activeSkin.colors.textPrimary,
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl"
                style={{ color: activeSkin.colors.textSecondary }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManualNote}
                disabled={!manualContent.trim()}
                className="px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-40"
                style={{
                  backgroundColor: activeSkin.colors.accent,
                  color: activeSkin.colors.accentText,
                }}
              >
                Save to Resources
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* MODAL: MAKE FLASHCARDS FROM RESOURCE */}
      {/* --------------------------------------------------------- */}
      {makeCardsModalOpen && resourceForCards && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div
            className="border w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4"
            style={{
              backgroundColor: activeSkin.colors.surface,
              borderColor: activeSkin.colors.border,
              color: activeSkin.colors.textPrimary,
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4" style={{ color: activeSkin.colors.accent }} />
                Make Cards from "{resourceForCards.title}"
              </h3>
              <button
                type="button"
                onClick={() => setMakeCardsModalOpen(false)}
                className="p-1 rounded-lg hover:opacity-75"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs" style={{ color: activeSkin.colors.textSecondary }}>
              AI will extract high-yield questions, key answers, and spaced repetition mnemonics from this material.
            </p>

            <div className="space-y-3">
              {/* Destination Deck */}
              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: activeSkin.colors.textMuted }}>
                  Destination Deck:
                </label>
                <select
                  value={targetDeckId}
                  onChange={(e) => setTargetDeckId(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  style={{
                    backgroundColor: activeSkin.colors.surfaceHover,
                    borderColor: activeSkin.colors.border,
                    color: activeSkin.colors.textPrimary,
                  }}
                >
                  <option value="new">+ Create New Deck</option>
                  {decks.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.cardCount || 0} cards)
                    </option>
                  ))}
                </select>
              </div>

              {targetDeckId === 'new' && (
                <div>
                  <label className="text-[11px] font-bold block mb-1" style={{ color: activeSkin.colors.textMuted }}>
                    New Deck Title:
                  </label>
                  <input
                    type="text"
                    value={newDeckTitle}
                    onChange={(e) => setNewDeckTitle(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                    style={{
                      backgroundColor: activeSkin.colors.surfaceHover,
                      borderColor: activeSkin.colors.border,
                      color: activeSkin.colors.textPrimary,
                    }}
                  />
                </div>
              )}

              {/* Card Count & Style */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold block mb-1" style={{ color: activeSkin.colors.textMuted }}>
                    Cards Count:
                  </label>
                  <select
                    value={cardCountToGenerate}
                    onChange={(e) => setCardCountToGenerate(parseInt(e.target.value, 10))}
                    className="w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    style={{
                      backgroundColor: activeSkin.colors.surfaceHover,
                      borderColor: activeSkin.colors.border,
                      color: activeSkin.colors.textPrimary,
                    }}
                  >
                    <option value={5}>5 Cards</option>
                    <option value={8}>8 Cards</option>
                    <option value={12}>12 Cards</option>
                    <option value={20}>20 Cards</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold block mb-1" style={{ color: activeSkin.colors.textMuted }}>
                    Card Format:
                  </label>
                  <select
                    value={cardStyleToGenerate}
                    onChange={(e) => setCardStyleToGenerate(e.target.value as any)}
                    className="w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    style={{
                      backgroundColor: activeSkin.colors.surfaceHover,
                      borderColor: activeSkin.colors.border,
                      color: activeSkin.colors.textPrimary,
                    }}
                  >
                    <option value="conceptual">Conceptual Q&A</option>
                    <option value="definition">Definitions</option>
                    <option value="cloze">Fill-in-the-blank</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMakeCardsModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl"
                style={{ color: activeSkin.colors.textSecondary }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmGenerateCards}
                disabled={isGeneratingCards}
                className="px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1.5"
                style={{
                  backgroundColor: activeSkin.colors.accent,
                  color: activeSkin.colors.accentText,
                }}
              >
                {isGeneratingCards ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Extracting Cards...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Flashcards</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
