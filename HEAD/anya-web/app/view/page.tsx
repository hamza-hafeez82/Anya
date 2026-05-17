"use client";

import { PanelFrame } from "@/components/PanelFrame";
import { CameraView } from "@/components/CameraView";
import { useWS } from "@/lib/ws-context";
import { useEffect, useState } from "react";
import { SceneData, Detection } from "@/lib/types";

export default function ViewPage() {
  const { on, off } = useWS();
  const [scene, setScene] = useState<SceneData | null>(null);
  const [detections, setDetections] = useState<{ faces: Detection[], objects: Detection[] }>({ faces: [], objects: [] });

  useEffect(() => {
    const handleDetections = (data: any) => {
      if (data.scene) setScene(data.scene);
      if (data.faces || data.objects) {
        setDetections({ faces: data.faces || [], objects: data.objects || [] });
      }
    };
    on("detections", handleDetections);
    return () => off("detections", handleDetections);
  }, [on, off]);

  const allDetections = [...detections.faces, ...detections.objects];

  return (
    <div className="p-3 pb-8 h-full flex flex-col space-y-3">
      
      <div className="mb-2">
        <CameraView />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PanelFrame title="SCENE" status={scene ? `${Math.round(scene.confidence * 100)}%` : "WAIT"}>
          {scene ? (
            <div className="flex flex-col space-y-2">
              <span className="text-[var(--text-primary)] font-mono text-lg lowercase">{scene.type}</span>
              <div className="flex flex-wrap gap-1">
                {scene.tags.map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-[9px] text-[var(--text-secondary)] font-mono">#{tag}</span>
                ))}
              </div>
              <span className={`text-[10px] font-mono ${scene.atmosphere === 'calm' ? 'text-[var(--accent-green)]' : scene.atmosphere === 'tense' ? 'text-[var(--accent-yellow)]' : 'text-[var(--accent-pink)]'}`}>
                ATMOSPHERE: {scene.atmosphere}
              </span>
            </div>
          ) : (
            <div className="text-[var(--text-secondary)] text-xs font-mono">AWAITING DATA</div>
          )}
        </PanelFrame>

        <PanelFrame title="DETECTIONS" status={allDetections.length.toString()}>
          {allDetections.length > 0 ? (
            <div className="flex flex-col space-y-1.5 h-[100px] overflow-y-auto pr-1">
              {detections.faces.map((f, i) => (
                <div key={`f-${i}`} className="flex items-center justify-between border-b border-[var(--border)] pb-1 last:border-0">
                  <div className="flex items-center space-x-1">
                    <span className="text-[var(--accent-pink)] text-[10px]">👤</span>
                    <span className="text-[10px] font-mono text-[var(--text-primary)]">{f.identity || "unknown"}</span>
                  </div>
                  <span className="text-[8px] font-mono text-[var(--accent-green)]">{f.relation || "owner"}</span>
                </div>
              ))}
              {detections.objects.map((o, i) => (
                <div key={`o-${i}`} className="flex items-center justify-between border-b border-[var(--border)] pb-1 last:border-0">
                  <div className="flex items-center space-x-1">
                    <span className="text-[var(--accent-cyan)] text-[10px]">📦</span>
                    <span className="text-[10px] font-mono text-[var(--text-primary)]">{o.label}</span>
                  </div>
                  <span className="text-[8px] font-mono text-[var(--text-secondary)]">{o.distance ? `${o.distance}m` : ''} {o.confidence > 0.8 ? 'high' : 'low'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[var(--text-secondary)] text-xs font-mono">NO TARGETS</div>
          )}
        </PanelFrame>
      </div>

    </div>
  );
}
