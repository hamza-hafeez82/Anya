"use client";

import { PanelFrame } from "@/components/PanelFrame";
import dynamic from "next/dynamic";
import { useWS } from "@/lib/ws-context";
import { useEffect, useState } from "react";

// Dynamic import Leaflet map because it requires window
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="w-full h-full bg-[var(--bg-secondary)] flex items-center justify-center font-mono text-xs text-[var(--text-secondary)]">LOADING MAP...</div> });

export default function LocatePage() {
  const { on, off } = useWS();
  const [room, setRoom] = useState<string>("unknown");
  const [zone, setZone] = useState<string>("unknown");

  useEffect(() => {
    const handleLocation = (data: any) => {
      if (data.room) setRoom(data.room);
      if (data.zone) setZone(data.zone);
    };
    on("location", handleLocation);
    return () => off("location", handleLocation);
  }, [on, off]);

  return (
    <div className="p-3 pb-8 h-full flex flex-col space-y-3">
      
      <div className="flex-1 min-h-[300px]">
        <PanelFrame title="MAP" className="h-full flex flex-col" glowColor="cyan">
          <div className="flex-1 w-full relative">
             <MapView />
          </div>
        </PanelFrame>
      </div>

      <PanelFrame title="ENVIRONMENT">
        <div className="flex flex-col space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">ROOM:</span>
            <span className="text-[var(--text-primary)]">{room}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">ZONE:</span>
            <span className="text-[var(--text-primary)]">{zone}</span>
          </div>
        </div>
      </PanelFrame>

    </div>
  );
}
