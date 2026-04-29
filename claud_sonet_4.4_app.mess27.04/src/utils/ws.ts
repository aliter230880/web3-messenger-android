// WebSocket simulation for real-time messaging
// In production, connect to your WebSocket server

type MessageHandler = (data: WSMessage) => void;

export interface WSMessage {
  type: 'message' | 'typing' | 'online' | 'offline' | 'read';
  chatId?: string;
  message?: {
    id: string;
    from: string;
    to: string;
    content: string;
    timestamp: number;
    type: 'text' | 'image' | 'file' | 'system';
  };
  userId?: string;
  status?: 'online' | 'offline' | 'away';
}

class WSClient {
  private handlers: Set<MessageHandler> = new Set();
  private connected = false;
  private simulationInterval: ReturnType<typeof setInterval> | null = null;

  connect(address: string) {
    this.connected = true;
    console.log(`[WS] Connected as ${address}`);
    
    // Simulate incoming messages
    this.simulateActivity();
  }

  disconnect() {
    this.connected = false;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  send(data: WSMessage) {
    if (!this.connected) return;
    console.log('[WS] Sending:', data);
    // In production, send to WebSocket server
  }

  on(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emit(data: WSMessage) {
    this.handlers.forEach((h) => h(data));
  }

  private simulateActivity() {
    // Simulate user going online/offline
    const statuses: Array<'online' | 'offline' | 'away'> = ['online', 'away', 'offline'];
    const addresses = [
      '0x1234567890abcdef1234567890abcdef12345678',
      '0xabcdef1234567890abcdef1234567890abcdef12',
      '0x9876543210fedcba9876543210fedcba98765432',
    ];

    let tick = 0;
    this.simulationInterval = setInterval(() => {
      tick++;
      
      // Random status update
      if (tick % 5 === 0) {
        const addr = addresses[Math.floor(Math.random() * addresses.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        this.emit({ type: 'online', userId: addr, status });
      }
    }, 3000);
  }
}

export const wsClient = new WSClient();
