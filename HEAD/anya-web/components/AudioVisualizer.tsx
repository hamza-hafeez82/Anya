"use client";

import { useEffect, useRef, useState } from "react";

export function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [dbLevel, setDbLevel] = useState<number>(-100);

  useEffect(() => {
    let audioCtx: AudioContext;
    let analyser: AnalyserNode;
    let dataArray: Uint8Array;
    let source: MediaStreamAudioSourceNode;
    let animationId: number;

    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasPermission(true);
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        draw();
      } catch (err) {
        console.error("Audio access denied", err);
        setHasPermission(false);
      }
    };

    const draw = () => {
      if (!canvasRef.current || !analyser) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      
      analyser.getByteFrequencyData(dataArray as any);

      // Calculate approximate dB
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      // map 0-255 to roughly -100 to 0 dB
      const currentDb = avg === 0 ? -100 : 20 * Math.log10(avg / 255);
      setDbLevel(prev => prev * 0.8 + currentDb * 0.2); // smooth

      ctx.clearRect(0, 0, width, height);

      // Draw Spectrum
      const barWidth = (width / dataArray.length) * 2.5;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * height;

        // Gradient from pink to cyan based on frequency
        const r = 255 - (i * 2);
        const g = 107 + i;
        const b = 157 + i;

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }

      animationId = requestAnimationFrame(draw);
    };

    initAudio();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioCtx) audioCtx.close();
    };
  }, []);

  const getLevelColor = (db: number) => {
    if (db < -40) return "text-gray-600 bg-gray-600";
    if (db < -20) return "text-[var(--accent-green)] bg-[var(--accent-green)]";
    if (db < -10) return "text-[var(--accent-cyan)] bg-[var(--accent-cyan)]";
    return "text-[var(--accent-yellow)] bg-[var(--accent-yellow)]";
  };

  const dbPercentage = Math.max(0, Math.min(100, (dbLevel + 100) * (100/100))); // roughly 0 to 100%

  if (hasPermission === false) {
    return (
      <div className="w-full h-[150px] flex flex-col items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 text-center">
        <span className="text-2xl mb-2">🎤</span>
        <h3 className="font-mono text-[var(--accent-yellow)] text-sm">MIC DENIED</h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3">
      {/* Spectrum */}
      <div className="w-full h-[120px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg overflow-hidden relative">
        <div className="absolute top-2 left-2 text-[8px] font-mono text-[var(--text-secondary)]">SPECTRUM 0-20kHz</div>
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={120} 
          className="w-full h-full"
        />
      </div>

      {/* Levels */}
      <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-[var(--text-secondary)]">LEVELS</span>
          <span className={`text-[10px] font-mono ${getLevelColor(dbLevel).split(' ')[0]}`}>{Math.round(dbLevel)}dB</span>
        </div>
        <div className="w-full h-3 bg-black border border-[var(--border)] relative overflow-hidden">
          <div 
            className={`absolute top-0 left-0 bottom-0 ${getLevelColor(dbLevel).split(' ')[1]} transition-all duration-75`}
            style={{ width: `${dbPercentage}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-[8px] font-mono text-[var(--text-secondary)]">CLASS: {dbLevel > -10 ? 'loud' : dbLevel > -40 ? 'moderate' : 'silent'}</span>
        </div>
      </div>
    </div>
  );
}
