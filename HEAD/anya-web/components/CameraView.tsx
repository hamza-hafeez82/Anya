"use client";

import { useWS } from "@/lib/ws-context";
import { useEffect, useRef, useState } from "react";
import { Detection } from "@/lib/types";

export function CameraView() {
  const { on, off } = useWS();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [detections, setDetections] = useState<{ faces: Detection[], objects: Detection[] }>({ faces: [], objects: [] });

  useEffect(() => {
    // Request camera
    navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: "environment" } 
    }).then((stream) => {
      setHasPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }).catch((err) => {
      console.error("Camera access denied or unavailable", err);
      // Fallback to try any camera if environment facing fails
      navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        setHasPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }).catch(() => setHasPermission(false));
    });

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
  }, [on, off]);

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
    <div className="relative w-full aspect-[3/4] bg-black rounded-lg overflow-hidden border border-[var(--border)] panel-brackets">
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted 
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas 
        ref={canvasRef}
        width={300} // Logical size, will stretch to fit via CSS
        height={400}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
}
