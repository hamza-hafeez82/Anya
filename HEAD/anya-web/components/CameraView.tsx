"use client";

import { useWS } from "@/lib/ws-context";
import { useEffect, useRef, useState, useCallback } from "react";
import { Detection } from "@/lib/types";

export function CameraView() {
  const { on, off } = useWS();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [detections, setDetections] = useState<{ faces: Detection[], objects: Detection[] }>({ faces: [], objects: [] });

  const startCamera = useCallback(async (mode: "user" | "environment") => {
    try {
      // Stop existing tracks
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: mode } 
      });
      setHasPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied or unavailable", err);
      // Fallback
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (fallbackErr) {
        setHasPermission(false);
      }
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);

    const handleDetections = (data: any) => {
      if (data.faces || data.objects) {
        setDetections({ faces: data.faces || [], objects: data.objects || [] });
      }
    };

    on("detections", handleDetections);
    return () => {
      off("detections", handleDetections);
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode, on, off, startCamera]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  // Draw bounding boxes
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // We assume canvas resolution matches the layout aspect
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawBox = (d: Detection, color: string) => {
      const x = d.bbox.x * canvas.width;
      const y = d.bbox.y * canvas.height;
      const w = d.bbox.w * canvas.width;
      const h = d.bbox.h * canvas.height;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = Math.max(0.3, d.confidence);
      ctx.strokeRect(x, y, w, h);

      // Label background
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x, Math.max(0, y - 16), w, 16);

      // Label text
      ctx.fillStyle = "#000";
      ctx.globalAlpha = 1.0;
      ctx.font = "10px monospace";
      let text = d.label || d.identity || "unknown";
      if (d.distance) text += ` ${d.distance}m`;
      ctx.fillText(text, x + 2, Math.max(12, y - 4));

      // Draw corner brackets
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      const len = 6;
      // Top Left
      ctx.beginPath(); ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
      // Top Right
      ctx.beginPath(); ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len); ctx.stroke();
      // Bottom Left
      ctx.beginPath(); ctx.moveTo(x, y + h - len); ctx.lineTo(x, y + h); ctx.lineTo(x + len, y + h); ctx.stroke();
      // Bottom Right
      ctx.beginPath(); ctx.moveTo(x + w - len, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - len); ctx.stroke();
    };

    detections.faces.forEach(f => drawBox(f, "#ff6b9d")); // pink
    detections.objects.forEach(o => drawBox(o, "#22d3ee")); // cyan

  }, [detections]);

  if (hasPermission === false) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 text-center">
        <span className="text-3xl mb-2">📷</span>
        <h3 className="font-mono text-[var(--accent-yellow)] text-sm mb-1">CAMERA DENIED</h3>
        <p className="font-sans text-[10px] text-[var(--text-secondary)]">Please enable camera permissions to grant Anya visual access.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video md:aspect-[21/9] bg-black rounded-lg overflow-hidden border border-[var(--border)] panel-brackets group">
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted 
        className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
      />
      <canvas 
        ref={canvasRef}
        width={640} // Logical size
        height={360}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      <button 
        onClick={toggleCamera}
        className="absolute bottom-4 right-4 bg-[rgba(0,0,0,0.6)] hover:bg-[var(--bg-panel)] border border-[var(--border)] text-[var(--text-primary)] rounded-full p-3 transition-all z-20 backdrop-blur"
        title="Toggle Camera"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 7h-3a2 2 0 0 1-2-2V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1a2 2 0 0 1-2 2H2a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
          <path d="M16 11a4 4 0 0 1-8 0"/>
          <path d="M12 15v-4"/>
          <path d="m9 8 3-3 3 3"/>
        </svg>
      </button>
    </div>
  );
}
