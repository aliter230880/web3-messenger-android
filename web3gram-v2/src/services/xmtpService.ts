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
  /**
   * Race Client.create() against a timeout so we never hang forever.
   * If XMTP is unreachable the caller gets an error in ≤ TIMEOUT_MS ms.
   */
  private static async _createWithTimeout(
    signer: Signer,
    opts: { env: 'production' | 'dev' },
    timeoutMs = 5000
  ): Promise<Client> {
    return Promise.race([
      Client.create(signer, opts),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`XMTP timeout (${timeoutMs}ms) [${opts.env}]`)), timeoutMs)
      ),
    ]);
  }

  async initialize(signer: Signer): Promise<void> {
    // Try production first with 5-second timeout
    try {
      this.client = await XMTPService._createWithTimeout(signer, { env: 'production' }, 5000);
      this._env = 'production';
      console.log('✅ XMTP [production]:', this.client.address);
      return;
    } catch (error: any) {
      const msg = String(error?.message ?? '');
      const isNetworkIssue =
        error?.code === 14 ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('network') ||
        msg.includes('Failed to fetch') ||
        msg.includes('timeout');

      if (!isNetworkIssue) {
        // Signature rejected or unrecoverable error
        console.error('❌ XMTP init error:', error);
        throw error;
      }

      console.warn('⚠️ XMTP production недоступен, пробуем dev:', msg);
    }

    // Dev fallback — 4-second timeout
    try {
      this.client = await XMTPService._createWithTimeout(signer, { env: 'dev' }, 4000);
      this._env = 'dev';
      console.log('✅ XMTP [dev fallback]:', this.client.address);
    } catch (devErr: any) {
      console.warn('⚠️ XMTP dev также недоступен — работаем без XMTP:', devErr?.message);
      throw devErr;
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
