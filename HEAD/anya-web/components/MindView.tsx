"use client";

import { useWS } from "@/lib/ws-context";
import { useEffect, useState } from "react";
import { ContextSnapshot } from "@/lib/types";
import { PanelFrame } from "./PanelFrame";

export function MindView() {
  const { on, off } = useWS();
  const [context, setContext] = useState<ContextSnapshot | null>(null);

  useEffect(() => {
    const handleContext = (data: any) => {
      if (data.data) {
        setContext(data.data);
      }
    };
    on("context_snapshot", handleContext);
    return () => off("context_snapshot", handleContext);
  }, [on, off]);

  if (!context) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="font-mono text-xs text-[var(--accent-cyan)] tracking-widest flex items-center">
          AWAITING COGNITION
          <span className="w-2 h-4 bg-[var(--accent-cyan)] ml-1 animate-pulse"></span>
        </div>
      </div>
    );
  }

  // Fallbacks if shape is incomplete
  const meta = context.meta || { situation_summary: "Analyzing..." };
  const selfState = context.self_state || { 
    cognitive_path: "DELIBERATE", 
    emotions: { valence: 0.5, arousal: 0.5, social_bat: 0.5, curiosity: 0.5 }
  };
  const attention = context.attention || { primary: [], suppressed: [] };
  const memories = context.self_state?.relevant_memories || [];

  const getPathColor = (path: string) => {
    if (path === "REFLEX") return "text-[var(--accent-yellow)] border-[var(--accent-yellow)] shadow-[var(--glow-yellow)]";
    if (path === "HABITUAL") return "text-[var(--accent-cyan)] border-[var(--accent-cyan)] shadow-[var(--glow-cyan)]";
    return "text-[var(--accent-pink)] border-[var(--accent-pink)] shadow-[var(--glow-pink)]";
  };

  const emotions = selfState.emotions || {};

  return (
    <div className="p-3 pb-8 flex flex-col space-y-3">
      
      <PanelFrame title="SITUATION">
        <p className="font-sans text-sm text-[var(--text-primary)] leading-relaxed italic">
          "{meta.situation_summary}"
        </p>
      </PanelFrame>

      <PanelFrame title="COGNITIVE PATH">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-2 h-2 rounded-full bg-current"></div>
          <span className={`px-2 py-0.5 border rounded text-xs font-mono font-bold ${getPathColor(selfState.cognitive_path)}`}>
            {selfState.cognitive_path || "UNKNOWN"}
          </span>
        </div>
        {selfState.triggers && (
          <div className="text-[10px] font-mono text-[var(--text-secondary)]">
            triggers: [{selfState.triggers.join(", ")}]
          </div>
        )}
      </PanelFrame>

      <PanelFrame title="EMOTION STATE">
        <div className="flex flex-col space-y-2">
          {Object.entries(emotions).map(([key, val]) => {
            const numVal = typeof val === 'number' ? val : 0;
            const percentage = Math.round(numVal * 100);
            return (
              <div key={key} className="flex items-center justify-between text-xs font-mono">
                <span className="w-24 text-[var(--text-secondary)]">{key}</span>
                <div className="flex-1 flex items-center space-x-2">
                  <div className="flex-1 h-2 bg-[var(--bg-secondary)] border border-[var(--border)] overflow-hidden">
                    <div 
                      className="h-full bg-[var(--accent-pink)] transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[var(--text-primary)]">{numVal.toFixed(1)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </PanelFrame>

      <PanelFrame title="ATTENTION">
        <div className="flex flex-col space-y-1">
          {attention.primary?.map((item: string, i: number) => (
            <div key={`p-${i}`} className="flex items-center space-x-2 text-xs font-mono text-[var(--accent-cyan)]">
              <span>→</span>
              <span>{item}</span>
            </div>
          ))}
          {attention.suppressed?.map((item: string, i: number) => (
            <div key={`s-${i}`} className="flex items-center space-x-2 text-xs font-mono text-[var(--text-secondary)] opacity-50">
              <span>↓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </PanelFrame>

      <PanelFrame title="MEMORY RECALL">
        <div className="flex flex-col space-y-2 max-h-[150px] overflow-y-auto">
          {memories.length > 0 ? memories.map((mem: string, i: number) => (
            <div key={i} className="text-sm font-sans text-[var(--text-primary)] pl-2 border-l-2 border-[var(--accent-pink)] bg-[rgba(255,107,157,0.05)] p-1 rounded-r animate-[slideIn_0.3s_ease-out]">
              "{mem}"
            </div>
          )) : (
            <div className="text-xs font-mono text-[var(--text-secondary)]">NO RELEVANT MEMORIES</div>
          )}
        </div>
      </PanelFrame>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </div>
  );
}
