"use client";

import { PanelFrame } from "@/components/PanelFrame";
import { useWS } from "@/lib/ws-context";
import { ExpressionName } from "@/lib/types";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Dynamic import nipplejs to avoid SSR errors
const Joystick = dynamic(() => import("@/components/Joystick"), { ssr: false });

const EXPRESSIONS: ExpressionName[] = [
  "happy", "excited", "loved", "laugh",
  "shocked", "cringe", "creepy", "cry",
  "sleepy", "hurt", "neutral"
];

export default function ControlPage() {
  const { send, systemStatus } = useWS();
  const router = useRouter();
  const [panTilt, setPanTilt] = useState({ pan: 0, tilt: 0 });

  const handleMove = (data: { x: number, y: number }) => {
    send({ type: "control_move", x: data.x, y: data.y });
  };

  const handleMoveEnd = () => {
    send({ type: "control_move", x: 0, y: 0 });
  };

  const handleNeck = (data: { x: number, y: number }) => {
    const pan = Math.round(data.x * 80);
    const tilt = Math.round(data.y * 25);
    setPanTilt({ pan, tilt });
    send({ type: "control_neck", pan, tilt });
  };

  const handleNeckEnd = () => {
    setPanTilt({ pan: 0, tilt: 0 });
    // Or keep last position depending on requirements
  };

  const handleExpression = (exp: string) => {
    send({ type: "control_expression", expression: exp });
    router.push("/");
  };

  const handleStop = () => {
    send({ type: "control_stop" });
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  return (
    <div className="p-3 pb-8 h-full flex flex-col space-y-3">
      
      <PanelFrame title="NECK CONTROL">
        <div className="flex flex-col space-y-2 font-mono text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">PAN:</span>
            <span className="text-[var(--text-primary)]">{panTilt.pan > 0 ? '+' : ''}{panTilt.pan}°</span>
            <div className="flex-1 ml-4 h-[1px] bg-[var(--border)] relative">
              <div 
                className="absolute w-2 h-3 bg-[var(--accent-cyan)] top-[-5px] ml-[-4px] transition-all"
                style={{ left: `${(panTilt.pan + 80) / 160 * 100}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">TILT:</span>
            <span className="text-[var(--text-primary)]">{panTilt.tilt > 0 ? '+' : ''}{panTilt.tilt}°</span>
            <div className="flex-1 ml-4 h-[1px] bg-[var(--border)] relative">
              <div 
                className="absolute w-2 h-3 bg-[var(--accent-cyan)] top-[-5px] ml-[-4px] transition-all"
                style={{ left: `${(panTilt.tilt + 25) / 50 * 100}%` }}
              />
            </div>
          </div>
        </div>
      </PanelFrame>

      <div className="flex flex-row justify-around py-4">
        <Joystick label="LEFT" type="move" onMove={handleMove} onEnd={handleMoveEnd} />
        <Joystick label="RIGHT" type="neck" onMove={handleNeck} onEnd={handleNeckEnd} />
      </div>

      <PanelFrame title="EXPRESSIONS">
        <div className="flex flex-wrap gap-2">
          {EXPRESSIONS.map(exp => {
            const isActive = systemStatus.expression === exp;
            return (
              <button
                key={exp}
                onClick={() => handleExpression(exp)}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-all border ${
                  isActive 
                    ? 'bg-[var(--accent-pink)] text-black border-[var(--accent-pink)] shadow-[var(--glow-pink)] font-bold'
                    : 'bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent-pink)] hover:text-[var(--accent-pink)]'
                }`}
              >
                [{exp}]
              </button>
            );
          })}
        </div>
      </PanelFrame>

      <div className="mt-auto pt-4">
        <button 
          onClick={handleStop}
          className="w-full h-[50px] bg-red-600 active:bg-red-700 text-white font-mono font-bold tracking-widest text-lg rounded shadow-[0_0_20px_rgba(220,38,38,0.5)] border border-red-400"
        >
          ■ EMERGENCY STOP
        </button>
      </div>

    </div>
  );
}
