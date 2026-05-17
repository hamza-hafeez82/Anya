"use client";

import { useEffect, useRef } from "react";
import nipplejs from "nipplejs";

interface JoystickProps {
  label: string;
  type: "move" | "neck";
  onMove: (data: { x: number, y: number }) => void;
  onEnd: () => void;
}

export default function Joystick({ label, type, onMove, onEnd }: JoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const posRef = useRef({ x: 0, y: 0 });

  const onMoveRef = useRef(onMove);
  const onEndRef = useRef(onEnd);

  // Sync callbacks without recreating the joystick instance
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    if (!containerRef.current) return;

    managerRef.current = nipplejs.create({
      zone: containerRef.current,
      mode: "static",
      position: { left: "50%", top: "50%" },
      color: "var(--accent-pink)",
      size: 100,
    });

    managerRef.current.on("move", (evt: any, data: any) => {
      let x = data?.vector?.x || 0;
      let y = data?.vector?.y || 0; // note nipplejs y is inverted usually, up is positive here
      
      posRef.current = { x, y };
      
      // Start throttle interval if not running
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          onMoveRef.current(posRef.current);
        }, 50); // 50ms throttle
      }
    });

    managerRef.current.on("end", () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      posRef.current = { x: 0, y: 0 };
      onEndRef.current();
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (managerRef.current) managerRef.current.destroy();
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="text-[10px] font-mono text-[var(--text-secondary)] mb-2 tracking-widest">{label}</div>
      <div 
        className="w-[120px] h-[120px] rounded-full bg-[var(--bg-secondary)] border-2 border-[var(--border)] relative"
      >
        {/* Visual zone crosshair/grid */}
        <div className="absolute inset-0 m-auto w-full h-[1px] bg-[rgba(34,211,238,0.1)]"></div>
        <div className="absolute inset-0 m-auto h-full w-[1px] bg-[rgba(34,211,238,0.1)]"></div>
        <div className="absolute inset-[10px] rounded-full border border-[rgba(34,211,238,0.2)]"></div>
        
        {/* Nipple container */}
        <div ref={containerRef} className="absolute inset-0 z-10"></div>
      </div>
      <div className="text-[10px] font-mono text-[var(--accent-pink)] mt-2 font-bold tracking-widest">{type.toUpperCase()}</div>
    </div>
  );
}
