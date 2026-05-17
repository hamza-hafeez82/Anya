"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { wsClient } from "./ws-client";
import { SystemStatus, ExpressionName } from "./types";
import { useRouter } from "next/navigation";

interface WSContextType {
  send: (msg: object) => void;
  on: (type: string, handler: (data: any) => void) => void;
  off: (type: string, handler: (data: any) => void) => void;
  status: "connecting" | "connected" | "disconnected";
  systemStatus: SystemStatus;
}

const defaultStatus: SystemStatus = {
  battery: 100,
  mood: "neutral",
  connection: "offline",
  uptime: 0,
  expression: "neutral",
};

const WSContext = createContext<WSContextType>({
  send: () => {},
  on: () => {},
  off: () => {},
  status: "disconnected",
  systemStatus: defaultStatus,
});

export function WSProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(defaultStatus);
  const router = useRouter();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_GATEWAY_WS_URL || "ws://localhost:8080/ws";
    
    const handleStatusChange = (newStatus: "connecting" | "connected" | "disconnected") => {
      setStatus(newStatus);
      setSystemStatus(prev => ({
        ...prev,
        connection: newStatus === "connected" ? "online" : (newStatus === "connecting" ? "connecting" : "offline")
      }));
    };

    const handleSystemStatus = (data: any) => {
      if (data.battery !== undefined) {
        setSystemStatus(prev => ({ ...prev, ...data }));
      }
    };

    const handleNavigate = (data: any) => {
      if (data.path) {
        router.push(data.path);
      }
    };

    wsClient.on("status_change", handleStatusChange);
    wsClient.on("status", handleSystemStatus);
    wsClient.on("navigate", handleNavigate);
    
    wsClient.connect(url);

    return () => {
      wsClient.off("status_change", handleStatusChange);
      wsClient.off("status", handleSystemStatus);
      wsClient.off("navigate", handleNavigate);
      wsClient.disconnect();
    };
  }, [router]);

  const value = {
    send: (msg: object) => wsClient.send(msg),
    on: (type: string, handler: (data: any) => void) => wsClient.on(type, handler),
    off: (type: string, handler: (data: any) => void) => wsClient.off(type, handler),
    status,
    systemStatus,
  };

  return <WSContext.Provider value={value}>{children}</WSContext.Provider>;
}

export function useWS() {
  return useContext(WSContext);
}
