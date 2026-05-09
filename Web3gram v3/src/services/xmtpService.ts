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

  private static async _createWithTimeout(
    signer: Signer,
    opts: { env: 'production' | 'dev'; skipContactPublishing?: boolean },
    timeoutMs = 5000
  ): Promise<Client> {
    return Promise.race([
      Client.create(signer, opts as any),
      new Promise<Client>((_, reject) =>
        setTimeout(
          () => reject(new Error(`XMTP timeout (${timeoutMs}ms) [${opts.env}]`)),
          timeoutMs
        )
      ),
    ]) as Promise<Client>;
  }

  async initialize(signer: Signer): Promise<void> {
    // Fast path: skip re-publishing the contact bundle for returning users
    try {
      this.client = await XMTPService._createWithTimeout(
        signer,
        { env: 'production', skipContactPublishing: true },
        4000
      );
      this._env = 'production';
      console.log('✅ XMTP [production fast]:', this.client.address);
      return;
    } catch (fastErr: any) {
      const msg = String(fastErr?.message ?? '');
      const isAuth =
        !msg.includes('timeout') &&
        !msg.includes('network') &&
        !msg.includes('UNAVAILABLE') &&
        !msg.includes('Failed to fetch') &&
        fastErr?.code !== 14;

      if (isAuth) {
        console.error('❌ XMTP auth error:', fastErr);
        throw fastErr;
      }
      console.warn('⚠️ XMTP fast path failed, trying full init:', msg);
    }

    // Full init
    try {
      this.client = await XMTPService._createWithTimeout(
        signer,
        { env: 'production' },
        4000
      );
      this._env = 'production';
      console.log('✅ XMTP [production full]:', this.client.address);
    } catch (fullErr: any) {
      console.warn('⚠️ XMTP недоступен — работаем без E2E:', fullErr?.message);
      throw fullErr;
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
    return messages.sort((a: any, b: any) => a.sent.getTime() - b.sent.getTime());
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
      try {
        await this._globalStream.return();
      } catch (_) {}
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

  async canMessage(address: string): Promise<boolean> {
    try {
      return await Client.canMessage(address, { env: this._env });
    } catch (error: any) {
      const code = error?.code;
      const msg = String(error?.message ?? '');
      if (code === 14 || msg.includes('UNAVAILABLE') || msg.includes('network')) {
        return true;
      }
      return true;
    }
  }

  async disconnect() {
    if (this._globalStream) {
      try {
        await this._globalStream.return();
      } catch (_) {}
      this._globalStream = null;
    }
    this.client = null;
    console.log('🔌 XMTP отключён');
  }
}

export const xmtpService = XMTPService.getInstance();
