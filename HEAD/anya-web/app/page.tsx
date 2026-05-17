import { AnyaFace } from "@/components/AnyaFace";
import { SpeechBubble } from "@/components/SpeechBubble";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 pt-8 pb-4 relative">
      <div className="absolute top-4 text-[var(--accent-cyan)] font-mono text-xs font-bold tracking-widest opacity-80 z-20">
        WAKU WAKU!
      </div>
      
      <div className="w-full flex-1 flex flex-col items-center justify-center space-y-8 z-10 mt-8">
        <AnyaFace />
        <SpeechBubble />
      </div>

      <div className="absolute bottom-8 flex items-center space-x-2 text-[var(--text-secondary)] font-mono text-[10px] z-20">
        <div className="w-2 h-2 rounded-full bg-[var(--accent-pink)] animate-ping"></div>
        <span>LISTENING...</span>
      </div>
    </div>
  );
}
