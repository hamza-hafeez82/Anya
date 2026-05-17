/* eslint-disable */
"use client";

import { useWS } from "@/lib/ws-context";
import { useEffect, useState } from "react";
import Image from "next/image";

export function AnyaFace() {
  const { systemStatus } = useWS();
  const [currentExp, setCurrentExp] = useState(systemStatus.expression);
  const [prevExp, setPrevExp] = useState(systemStatus.expression);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (systemStatus.expression !== currentExp) {
      setPrevExp(currentExp);
      setCurrentExp(systemStatus.expression);
      setTransitioning(true);
      const timer = setTimeout(() => setTransitioning(false), 300);
      return () => clearTimeout(timer);
    }
  }, [systemStatus.expression, currentExp]);

  const getImageSrc = (exp: string) => {
    return `/assets/emotions/${exp}.jpg`;
  };

  return (
    <div className="relative w-full aspect-square flex items-center justify-center">
      {/* Background vignette/glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,107,157,0.1)_0%,transparent_70%)] rounded-full"></div>
      
      {/* Face Image Container */}
      <div className="relative w-[70%] aspect-square rounded-2xl overflow-hidden shadow-[var(--glow-pink)] animate-[breathe_4s_ease-in-out_infinite] bg-[var(--bg-secondary)] border border-[var(--border)]">
        
        {/* We use standard img to easily handle error fallback (since images might not exist locally) */}
        
        {/* Previous expression (fading out) */}
        {transitioning && (
          <img 
            src={getImageSrc(prevExp)}
            alt={prevExp}
            className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300"
            style={{ opacity: 0 }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2312121f"/><text x="50" y="50" fill="%238888aa" font-family="monospace" font-size="10" text-anchor="middle" alignment-baseline="middle">NO IMAGE</text></svg>';
            }}
          />
        )}
        
        {/* Current expression (fading in) */}
        <img 
          src={getImageSrc(currentExp)}
          alt={currentExp}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${transitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2312121f"/><text x="50" y="50" fill="%238888aa" font-family="monospace" font-size="10" text-anchor="middle" alignment-baseline="middle">NO IMAGE</text></svg>';
          }}
        />

        {/* CSS for breathing animation */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes breathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.015); }
          }
        `}} />
      </div>
    </div>
  );
}
