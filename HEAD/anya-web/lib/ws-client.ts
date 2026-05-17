type EventHandler = (data: any) => void;

class WSClient {
  private ws: WebSocket | null = null;
  private url: string = "";
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private pingInterval: any = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  public status: "connecting" | "connected" | "disconnected" = "disconnected";

  connect(url: string) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    
    this.url = url;
    this.status = "connecting";
    this.emit("status_change", this.status);

    try {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        this.status = "connected";
        this.reconnectAttempts = 0;
        this.emit("status_change", this.status);
        this.emit("reconnected", null);
        
        // Setup ping every 30s
        this.pingInterval = setInterval(() => {
          this.send({ type: "ping" });
        }, 30000);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg && msg.type) {
            this.emit(msg.type, msg);
          }
        } catch (e) {
          console.error("Failed to parse WS message", e);
        }
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };

      this.ws.onerror = () => {
        // onerror will be followed by onclose
      };
    } catch (e) {
      this.handleDisconnect();
    }
  }

  private handleDisconnect() {
    this.status = "disconnected";
    this.emit("status_change", this.status);
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
      const backoff = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, 30000);
      this.reconnectAttempts++;
      setTimeout(() => this.connect(this.url), backoff);
    }
  }

  disconnect() {
    this.maxReconnectAttempts = 0; // Prevent reconnect
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(msg: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  on(type: string, handler: EventHandler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
  }

  off(type: string, handler: EventHandler) {
    if (this.listeners.has(type)) {
      this.listeners.get(type)!.delete(handler);
    }
  }

  private emit(type: string, data: any) {
    if (this.listeners.has(type)) {
      this.listeners.get(type)!.forEach(handler => handler(data));
    }
  }
}

export const wsClient = new WSClient();
