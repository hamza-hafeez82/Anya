"use client";

import { useWS } from "@/lib/ws-context";
import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 17);
  }, [center, map]);
  return null;
}

export default function MapView() {
  const { on, off } = useWS();
  const [position, setPosition] = useState<[number, number]>([31.5204, 74.3587]); // Default Lahore
  const [accuracy, setAccuracy] = useState<number>(0);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [hasGPS, setHasGPS] = useState(false);

  // Memoize Leaflet icon on the client side to avoid constant recreation and DOM race conditions
  const anyaIcon = useMemo(() => {
    return L.divIcon({
      className: "custom-icon",
      html: `<div style="width: 12px; height: 12px; background-color: var(--accent-pink); border-radius: 50%; box-shadow: var(--glow-pink); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
             <div style="width: 12px; height: 12px; background-color: var(--accent-pink); border-radius: 50%; position: absolute; top: 0; left: 0;"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
  }, []);

  useEffect(() => {
    // Try browser GPS
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(newPos);
        setAccuracy(pos.coords.accuracy);
        setHasGPS(true);
        setTrail(prev => {
          const next = [...prev, newPos];
          return next.length > 10 ? next.slice(next.length - 10) : next;
        });
      },
      (err) => {
        console.warn("Browser GPS Error", err);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    // Listen for server location updates
    const handleLocation = (data: any) => {
      if (data.lat && data.lng) {
        const newPos: [number, number] = [data.lat, data.lng];
        setPosition(newPos);
        if (data.accuracy) setAccuracy(data.accuracy);
        setHasGPS(true);
        setTrail(prev => {
          const next = [...prev, newPos];
          return next.length > 10 ? next.slice(next.length - 10) : next;
        });
      }
    };

    on("location", handleLocation);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      off("location", handleLocation);
    };
  }, [on, off]);

  return (
    <div className="w-full h-full relative rounded-lg overflow-hidden border border-[var(--border)]">
      {!hasGPS && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-[1000] bg-[var(--bg-panel)] px-2 py-1 border border-[var(--accent-yellow)] rounded text-[9px] font-mono text-[var(--accent-yellow)] shadow-[var(--glow-yellow)]">
          GPS UNAVAILABLE - SHOWING DEFAULT
        </div>
      )}
      
      <MapContainer 
        center={position} 
        zoom={17} 
        style={{ width: '100%', height: '100%', background: '#080810' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
        />
        <Marker position={position} icon={anyaIcon} />
        {trail.length > 1 && (
          <Polyline 
            positions={trail} 
            color="var(--accent-pink)" 
            weight={3} 
            opacity={0.5} 
            dashArray="5, 10" 
          />
        )}
        <MapUpdater center={position} />
      </MapContainer>

      {/* Overlays for coordinates */}
      <div className="absolute bottom-2 left-2 z-[1000] bg-[rgba(0,0,0,0.6)] p-2 rounded border border-[var(--border)] backdrop-blur-sm pointer-events-none">
        <div className="text-[10px] font-mono text-[var(--text-primary)]">LAT {position[0].toFixed(4)}°</div>
        <div className="text-[10px] font-mono text-[var(--text-primary)]">LNG {position[1].toFixed(4)}°</div>
        {accuracy > 0 && (
          <div className="text-[8px] font-mono text-[var(--text-secondary)]">ACC ±{Math.round(accuracy)}m</div>
        )}
      </div>
    </div>
  );
}
