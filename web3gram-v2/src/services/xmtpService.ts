import { Client } from '@xmtp/xmtp-js';
import type { Signer } from 'ethers';

export class XMTPService {
  private client: Client | null = null;
  private static instance: XMTPService;
  private _globalStream: any = null;
  private _env: 'production' | 'dev' = 'production';

  private constructor() {}

  static getInstance(): XMTPService {
    if (!XMTPService.instance) {
      XMTPService.instance = new XMTPService();
    }
    return XMTPService.instance;
  }

  /**
   * Initialize XMTP client.
   *
   * XMTP-JS stores the key bundle in IndexedDB (LocalAuthenticatedKeystore).
   * - If keys already exist for this address → no wallet signature needed.
   * - If keys don't exist → exactly ONE wallet signature is requested.
   *
   * We try production only. If the XMTP network is unreachable (gRPC code 14),
   * we skip XMTP entirely instead of retrying with dev (which would request another signature).
   */
  async initialize(signer: Signer): Promise<void> {
    try {
      this.client = await Client.create(signer, { env: 'production' });
      this._env = 'production';
      console.log('✅ XMTP [production]:', this.client.address);
    } catch (error: any) {
      const code = error?.code;
      const msg = String(error?.message ?? '');

      if (code === 14 || msg.includes('UNAVAILABLE') || msg.includes('network') || msg.includes('Failed to fetch')) {
        // Network issue — try dev as a last resort WITH THE SAME KEYS already in IndexedDB
        // (no new signature needed if keys were already generated above)
        try {
          this.client = await Client.create(signer, { env: 'dev' });
          this._env = 'dev';
          console.log('✅ XMTP [dev fallback]:', this.client.address);
          return;
        } catch (devErr: any) {
          console.warn('⚠️ XMTP dev также недоступен — работаем без XMTP');
          throw devErr;
        }
      }

      // User rejected signature or other auth error — propagate
      console.error('❌ XMTP init error:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.client !== null;
  }

  getAddress(): string | null {
    return this.client?.address || null;
  }

  async sendMessage(recipientAddress: string, message: string): Promise<string> {
    if (!this.client) throw new Error('XMTP клиент не инициализирован');
    const conversation = await this.client.conversations.newConversation(recipientAddress);
    const sent = await conversation.send(message);
    console.log('✅ Сообщение отправлено:', sent.id);
    return sent.id;
  }

  async getConversations() {
    if (!this.client) throw new Error('XMTP клиент не инициализирован');
    return this.client.conversations.list();
  }

  async getMessages(recipientAddress: string, limit: number = 50) {
    if (!this.client) throw new Error('XMTP клиент не инициализирован');
    const conversation = await this.client.conversations.newConversation(recipientAddress);
    const messages = await conversation.messages({ limit });
    return messages.sort((a, b) => a.sent.getTime() - b.sent.getTime());
  }

  async subscribeToMessages(recipientAddress: string, callback: (message: any) => void) {
    if (!this.client) throw new Error('XMTP клиент не инициализирован');
    const conversation = await this.client.conversations.newConversation(recipientAddress);
    const stream = await conversation.streamMessages();
    (async () => {
      try {
        for await (const message of stream) {
          callback(message);
        }
      } catch (_) {}
    })();
    return stream;
  }

  async subscribeToAllMessages(callback: (message: any) => void) {
    if (!this.client) throw new Error('XMTP клиент не инициализирован');

    if (this._globalStream) {
      try { await this._globalStream.return(); } catch (_) {}
    }

    this._globalStream = await this.client.conversations.streamAllMessages();

    (async () => {
      try {
        for await (const message of this._globalStream) {
          callback(message);
        }
      } catch (_) {}
    })();

    return this._globalStream;
  }

  /**
   * Check if an address is registered on the XMTP network.
   * Returns true on any network error (don't block the user from starting a chat).
   */
  async canMessage(address: string): Promise<boolean> {
    try {
      return await Client.canMessage(address, { env: this._env });
    } catch (error: any) {
      const code = error?.code;
      const msg = String(error?.message ?? '');
      if (code === 14 || msg.includes('UNAVAILABLE') || msg.includes('network')) {
        return true; // Network down — assume reachable, don't block
      }
      return true; // Any error — don't block
    }
  }

  async disconnect() {
    if (this._globalStream) {
      try { await this._globalStream.return(); } catch (_) {}
      this._globalStream = null;
    }
    this.client = null;
    console.log('🔌 XMTP отключён');
  }
}

export const xmtpService = XMTPService.getInstance();
