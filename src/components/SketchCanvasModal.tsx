import React, { useRef, useState, useEffect } from 'react';
import { X, Check, RotateCcw, PenTool } from 'lucide-react';

interface SketchCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSketch: (dataUrl: string) => void;
  title?: string;
}

export function SketchCanvasModal({
  isOpen,
  onClose,
  onSaveSketch,
  title = 'Draw Diagram or Formula',
}: SketchCanvasModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#6366f1'); // Indigo
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill white/light background for clean export
    ctx.fillStyle = '#1e293b'; // slate-800 background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSaveSketch(dataUrl);
    onClose();
  };

  const colors = ['#ffffff', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#38bdf8'];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <PenTool className="w-4 h-4 text-indigo-400" />
            <span>{title}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
          {/* Color palette */}
          <div className="flex items-center gap-1.5">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setStrokeColor(c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full border transition-all ${
                  strokeColor === c ? 'ring-2 ring-indigo-400 scale-110 border-white' : 'border-slate-700 hover:scale-105'
                }`}
              />
            ))}
          </div>

          {/* Stroke width */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStrokeWidth(2)}
              className={`px-2 py-1 rounded text-xs ${strokeWidth === 2 ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Fine
            </button>
            <button
              type="button"
              onClick={() => setStrokeWidth(4)}
              className={`px-2 py-1 rounded text-xs ${strokeWidth === 4 ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Medium
            </button>
            <button
              type="button"
              onClick={() => setStrokeWidth(7)}
              className={`px-2 py-1 rounded text-xs ${strokeWidth === 7 ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Bold
            </button>
          </div>

          <button
            type="button"
            onClick={clearCanvas}
            className="text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>

        {/* Canvas area */}
        <div className="p-4 flex justify-center bg-slate-950">
          <canvas
            ref={canvasRef}
            width={440}
            height={260}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
            className="rounded-xl border border-slate-700 cursor-crosshair touch-none shadow-inner"
          />
        </div>

        {/* Footer actions */}
        <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasDrawn}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Check className="w-4 h-4" />
            Attach Sketch
          </button>
        </div>
      </div>
    </div>
  );
}
