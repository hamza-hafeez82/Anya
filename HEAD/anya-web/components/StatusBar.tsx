"use client";

import { useWS } from "@/lib/ws-context";
import { useEffect, useState } from "react";

export function StatusBar() {
  const { status, systemStatus } = useWS();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `UPT ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return "text-[var(--accent-green)]";
    if (level > 20) return "text-[var(--accent-yellow)]";
    return "text-red-500 animate-pulse";
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-[40px] bg-[var(--bg-secondary)] border-b border-[var(--border)] z-50 flex items-center justify-between px-3 font-mono text-[11px] max-w-[430px] mx-auto">
      {/* Left side */}
      <div className="flex items-center space-x-2">
        <span className="text-[var(--accent-pink)] font-bold tracking-widest uppercase">ANYA OS</span>
        <div className="flex items-center space-x-1 ml-2">
          <div className={`w-1.5 h-1.5 rounded-full ${status === "connected" ? "bg-[var(--accent-green)] animate-pulse shadow-[var(--glow-green)]" : "bg-red-500"}`}></div>
          <span className="text-[var(--text-secondary)]">{status === "connected" ? "ONLINE" : (status === "connecting" ? "CONN..." : "OFFLINE")}</span>
        </div>
      </div>

      {/* Center */}
      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-1.5">
        <span className="text-sm">
          {systemStatus.mood === "happy" ? "😊" : 
           systemStatus.mood === "sleepy" ? "😴" : 
           systemStatus.mood === "sad" ? "😢" : 
           systemStatus.mood === "angry" ? "😠" : "😐"}
        </span>
        <span className="text-[var(--text-secondary)]">{systemStatus.mood}</span>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-3">
        <span className="text-[var(--text-secondary)] hidden sm:inline-block">{formatUptime(systemStatus.uptime)}</span>
        <div className="flex items-center space-x-1">
          <span className={getBatteryColor(systemStatus.battery)}>
            {systemStatus.battery}%
          </span>
          <div className="w-4 h-2 border border-[var(--text-secondary)] rounded-[1px] relative">
            <div className={`absolute top-0 left-0 bottom-0 transition-all ${systemStatus.battery > 50 ? 'bg-[var(--accent-green)]' : systemStatus.battery > 20 ? 'bg-[var(--accent-yellow)]' : 'bg-red-500'}`} style={{ width: `${systemStatus.battery}%` }}></div>
            <div className="absolute top-[2px] right-[-2px] w-[1px] h-[2px] bg-[var(--text-secondary)]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
