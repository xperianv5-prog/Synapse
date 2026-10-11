import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Check, AlertCircle } from 'lucide-react';
import { Recorder, AudioRecordingResult } from '../utils/audio';

interface AudioRecorderWidgetProps {
  onAudioRecorded: (result: AudioRecordingResult) => void;
  onCancel?: () => void;
  existingAudioData?: string;
  onDeleteExisting?: () => void;
}

export function AudioRecorderWidget({
  onAudioRecorded,
  existingAudioData,
  onDeleteExisting,
}: AudioRecorderWidgetProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedResult, setRecordedResult] = useState<AudioRecordingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<Recorder | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current) recorderRef.current.cancel();
    };
  }, []);

  const handleStartRecording = async () => {
    setError(null);
    try {
      const recorder = new Recorder();
      recorderRef.current = recorder;
      await recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      setRecordedResult(null);

      timerRef.current = setInterval(() => {
        setRecordSeconds(s => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error starting audio recording:', err);
      setError('Microphone permission required for audio recording.');
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (!recorderRef.current || !isRecording) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);

    try {
      const result = await recorderRef.current.stop();
      setRecordedResult(result);
    } catch (err: any) {
      console.error('Error stopping recording:', err);
      setError('Failed to capture audio clip.');
    }
  };

  const handleAcceptRecording = () => {
    if (recordedResult) {
      onAudioRecorded(recordedResult);
      setRecordedResult(null);
      setRecordSeconds(0);
    }
  };

  const handleDiscardRecording = () => {
    setRecordedResult(null);
    setRecordSeconds(0);
  };

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Mic className="w-3.5 h-3.5 text-indigo-400" />
          Voice & Audio Recording
        </span>
        {existingAudioData && !isRecording && !recordedResult && (
          <button
            type="button"
            onClick={onDeleteExisting}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Remove attached audio
          </button>
        )}
      </div>

      {error && (
        <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-xl p-2.5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Recording in progress */}
      {isRecording ? (
        <div className="flex items-center justify-between bg-rose-950/40 border border-rose-800/50 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping inline-block" />
            <div className="flex items-center gap-0.5 h-4">
              {[40, 75, 55, 90, 60, 80, 45, 95].map((h, i) => (
                <div key={i} className="w-1 bg-rose-400 animate-pulse rounded-full" style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
            <span className="text-sm font-mono font-semibold text-rose-200">
              {formatTimer(recordSeconds)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleStopRecording}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            Done
          </button>
        </div>
      ) : recordedResult ? (
        /* Review newly recorded audio before attaching */
        <div className="space-y-2.5 bg-slate-800/60 border border-slate-700 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Recorded ({recordedResult.duration}s)
            </span>
            <audio controls src={recordedResult.base64Data} className="h-7 w-48" />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleDiscardRecording}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Retake
            </button>
            <button
              type="button"
              onClick={handleAcceptRecording}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-sm active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              Attach Audio
            </button>
          </div>
        </div>
      ) : (
        /* Ready to record button */
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleStartRecording}
            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Record Voice Clip</span>
          </button>
        </div>
      )}
    </div>
  );
}
