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
    try {
      this.client = await Client.create(signer, {
        env: 'production',
      });
      console.log('✅ XMTP клиент инициализирован:', this.client.address);
    } catch (error) {
      console.error('❌ Ошибка инициализации XMTP:', error);
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
    if (!this.client) {
      try {
        return Client.canMessage(address, { env: 'production' });
      } catch { return false; }
    }
    try {
      return Client.canMessage(address, { env: 'production' });
    } catch { return false; }
  }

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
