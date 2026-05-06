import { Client } from '@xmtp/xmtp-js';
import type { Signer } from 'ethers';

export class XMTPService {
  private client: Client | null = null;
  private static instance: XMTPService;
  private _globalStream: any = null;

  private constructor() {}

  static getInstance(): XMTPService {
    if (!XMTPService.instance) {
      XMTPService.instance = new XMTPService();
    }
    return XMTPService.instance;
  }

  async initialize(signer: Signer): Promise<void> {
    // Try production first, fallback to dev on network errors (gRPC code 14 = UNAVAILABLE)
    const envs: Array<'production' | 'dev'> = ['production', 'dev'];
    let lastError: unknown;

    for (const env of envs) {
      try {
        this.client = await Client.create(signer, { env });
        this._env = env;
        console.log(`✅ XMTP клиент инициализирован [${env}]:`, this.client.address);
        return;
      } catch (error: any) {
        lastError = error;
        const code = error?.code ?? error?.details?.code;
        // gRPC UNAVAILABLE (14) or connection issues — try next env
        if (code === 14 || String(error?.message).includes('UNAVAILABLE') || String(error?.message).includes('network')) {
          console.warn(`⚠️ XMTP ${env} недоступен, пробуем следующий...`);
          continue;
        }
        // Other error (e.g. user rejected signature) — rethrow immediately
        throw error;
      }
    }

    console.error('❌ XMTP недоступен на всех серверах:', lastError);
    throw lastError;
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

  /**
   * Загружает сообщения для конкретного диалога.
   * Возвращает в хронологическом порядке (старые → новые).
   */
  async getMessages(recipientAddress: string, limit: number = 50) {
    if (!this.client) throw new Error('XMTP клиент не инициализирован');
    const conversation = await this.client.conversations.newConversation(recipientAddress);
    const messages = await conversation.messages({ limit });
    return messages.sort((a, b) => a.sent.getTime() - b.sent.getTime());
  }

  /**
   * Подписка на сообщения конкретного диалога.
   * Возвращает stream — caller должен вызвать stream.return() для отписки.
   */
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

  /**
   * Глобальная подписка на ВСЕ новые сообщения из всех диалогов.
   * Вызывается один раз при инициализации XMTP.
   */
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

  async canMessage(address: string): Promise<boolean> {
    const envToTry = this._env ?? 'production';
    try {
      return await Client.canMessage(address, { env: envToTry });
    } catch (error: any) {
      const code = error?.code ?? error?.details?.code;
      // Network error — assume user can receive messages (don't block chat)
      if (code === 14 || String(error?.message).includes('UNAVAILABLE')) {
        return true;
      }
      // Try fallback env
      try {
        const fallback: 'production' | 'dev' = envToTry === 'production' ? 'dev' : 'production';
        return await Client.canMessage(address, { env: fallback });
      } catch {
        return true; // Network issues — don't block the user
      }
    }
  }

  private _env: 'production' | 'dev' = 'production';

  async disconnect() {
    if (this._globalStream) {
      try { await this._globalStream.return(); } catch (_) {}
      this._globalStream = null;
    }
    this.client = null;
    console.log('🔌 XMTP клиент отключён');
  }
}

export const xmtpService = XMTPService.getInstance();
