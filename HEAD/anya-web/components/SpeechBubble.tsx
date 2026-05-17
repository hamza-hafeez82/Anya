"use client";

import { useWS } from "@/lib/ws-context";
import { useEffect, useState } from "react";

export function SpeechBubble() {
  const { on, off } = useWS();
  const [text, setText] = useState("");
  const [visible, setVisible] = useState(false);
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let hideTimeout: NodeJS.Timeout;

    const handleVoice = (data: any) => {
      if (data.text) {
        setText(data.text);
        setVisible(true);
        setDisplayedText(""); // Reset for typewriter effect
        
        // Hide after some time based on text length + 3s
        const duration = Math.max(3000, data.text.length * 50 + 3000);
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
          setVisible(false);
        }, duration);
      }
    };

    on("voice", handleVoice);
    return () => {
      off("voice", handleVoice);
      clearTimeout(hideTimeout);
    };
  }, [on, off]);

  // Typewriter effect
  useEffect(() => {
    if (!visible || !text) return;
    
    let i = 0;
    const interval = setInterval(() => {
      if (i <= text.length) {
        setDisplayedText(text.substring(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 30); // typing speed
    
    return () => clearInterval(interval);
  }, [text, visible]);

  if (!visible && !text) return <div className="h-[80px]" />; // Spacer

  return (
    <div className={`h-[80px] flex items-center justify-center transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="relative max-w-[80%] bg-[var(--bg-panel)] border border-[var(--accent-pink)] rounded-2xl rounded-tl-none p-4 shadow-[var(--glow-pink)]">
        {/* Tail */}
        <div className="absolute top-0 left-[-10px] w-0 h-0 border-t-[0px] border-t-transparent border-r-[10px] border-r-[var(--accent-pink)] border-b-[15px] border-b-transparent"></div>
        <div className="absolute top-[2px] left-[-7px] w-0 h-0 border-t-[0px] border-t-transparent border-r-[8px] border-r-[var(--bg-panel)] border-b-[12px] border-b-transparent z-10"></div>
        
        <p className="font-sans text-sm text-[var(--text-primary)] leading-relaxed">
          {displayedText}
          <span className="animate-pulse ml-1 text-[var(--accent-pink)]">|</span>
        </p>
      </div>
    </div>
  );
}
