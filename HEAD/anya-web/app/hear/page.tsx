"use client";

import { PanelFrame } from "@/components/PanelFrame";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { useWS } from "@/lib/ws-context";
import { useEffect, useRef, useState } from "react";

interface TranscriptLine {
  text: string;
  speaker: string;
  sentiment: string;
  id: number;
}

export default function HearPage() {
  const { on, off } = useWS();
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  let idCounter = useRef(0);

  useEffect(() => {
    const handleAudioAnalysis = (data: any) => {
      if (data.transcript) {
        setTranscripts(prev => {
          const newLine = { 
            text: data.transcript, 
            speaker: data.speaker || "unknown", 
            sentiment: data.sentiment || "neutral",
            id: idCounter.current++
          };
          const next = [...prev, newLine];
          if (next.length > 10) return next.slice(next.length - 10);
          return next;
        });
      }
    };
    on("audio_analysis", handleAudioAnalysis);
    return () => off("audio_analysis", handleAudioAnalysis);
  }, [on, off]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  return (
    <div className="p-3 pb-8 h-full flex flex-col space-y-3">
      
      <div className="flex-none">
        <AudioVisualizer />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <PanelFrame title="TRANSCRIPTION" className="h-full flex flex-col">
          <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col space-y-3 pr-1 min-h-[150px]">
            {transcripts.length === 0 ? (
              <div className="text-[var(--text-secondary)] text-xs font-mono h-full flex items-center justify-center">
                AWAITING SPEECH...
              </div>
            ) : (
              transcripts.map((t) => (
                <div key={t.id} className="flex flex-col space-y-1 bg-[rgba(0,0,0,0.2)] p-2 rounded border border-[var(--border)]">
                  <span className="text-sm font-sans text-[var(--text-primary)]">"{t.text}"</span>
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded bg-[var(--accent-pink)] text-black text-[9px] font-mono font-bold">
                      {t.speaker}
                    </span>
                    <span className={`text-[9px] font-mono ${
                      t.sentiment === 'positive' ? 'text-[var(--accent-green)]' : 
                      t.sentiment === 'negative' ? 'text-red-400' : 'text-[var(--text-secondary)]'
                    }`}>
                      {t.sentiment}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </PanelFrame>
      </div>

    </div>
  );
}
