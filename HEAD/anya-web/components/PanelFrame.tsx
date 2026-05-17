"use client";

import { ReactNode } from "react";

interface PanelFrameProps {
  title: string;
  subtitle?: string;
  status?: string;
  children: ReactNode;
  glowColor?: "pink" | "green" | "cyan" | "yellow";
  className?: string;
}

export function PanelFrame({ title, subtitle, status, children, glowColor, className = "" }: PanelFrameProps) {
  const glowClass = glowColor ? `shadow-[var(--glow-${glowColor})] border-[var(--accent-${glowColor})]` : "border-[var(--border)]";

  return (
    <div className={`panel bg-[var(--bg-panel)] rounded-lg flex flex-col overflow-hidden mb-3 ${glowClass} ${className}`}>
      {/* Top Bar */}
      <div className="h-6 flex items-center justify-between px-3 border-b border-[var(--border)] bg-[rgba(0,0,0,0.2)]">
        <div className="flex items-baseline space-x-2">
          <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)] tracking-wider">{title}</span>
          {subtitle && (
            <span className="text-[9px] font-mono text-[var(--text-secondary)] opacity-70">{subtitle}</span>
          )}
        </div>
        
        {status && (
          <div className="flex items-center space-x-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse"></div>
            <span className="text-[9px] font-mono text-[var(--text-secondary)]">{status}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {children}
      </div>
    </div>
  );
}
