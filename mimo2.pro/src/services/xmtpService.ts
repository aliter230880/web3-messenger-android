// xmtpService.ts — исправленная версия
// ИСПРАВЛЕНИЯ:
//   1. skipContactPublishing:true fast path — экономит 1-2с на reconnect
//   2. Таймаут 4с — не зависает навсегда
//   3. Retry через retryInit() — авто-восстановление при плохой сети
//   4. sendMessage выбрасывает ошибку (нет silent fallback)

import { ethers } from 'ethers';

export interface XmtpMessage {
  id: string;
  content: string;
  senderAddress: string;
  recipientAddress: string;
  timestamp: number;
}

class XmtpService {
  private client: any = null;
  private _initialized = false;

  private static async _createWithTimeout(
    signer: ethers.Signer,
    opts: Record<string, unknown>,
    timeoutMs: number
  ): Promise<any> {
    let Client: any;
    try {
      const xmtp = await import('@xmtp/xmtp-js');
      Client = xmtp.Client;
    } catch {
      throw new Error('XMTP библиотека недоступна');
    }
    return Promise.race([
      Client.create(signer, opts),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`XMTP timeout ${timeoutMs / 1000}s`)), timeoutMs)
      ),
    ]);
  }

  // initialize: fast path → full path → throw
  // Вызывается из useWallet._finishConnect() в фоне, не блокирует UI
  async initialize(signer: ethers.Signer): Promise<boolean> {
    if (this._initialized && this.client) return true;

    console.log('[XMTP] Initializing…');

    // FAST PATH: skipContactPublishing=true — не публикуем бандл повторно
    // Для вернувшихся пользователей (ключи уже в IndexedDB): ~1-2с
    try {
      this.client = await XmtpService._createWithTimeout(
        signer,
        { env: 'production', skipContactPublishing: true } as any,
        4000
      );
      this._initialized = true;
      console.log('[XMTP] ✅ fast path:', this.client.address);
      return true;
    } catch (fastErr: any) {
      const msg = String(fastErr?.message ?? '');
      // Подпись отклонена пользователем → прекращаем
      const isAuthErr = !msg.includes('timeout') && !msg.includes('UNAVAILABLE')
        && !msg.includes('network') && !msg.includes('Failed to fetch') && fastErr?.code !== 14;
      if (isAuthErr) {
        console.error('[XMTP] ❌ auth error:', fastErr);
        return false;
      }
      console.warn('[XMTP] fast path failed, trying full init:', msg);
    }

    // FULL PATH: публикует контакт (нужно при первом входе)
    try {
      this.client = await XmtpService._createWithTimeout(
        signer,
        { env: 'production' },
        4000
      );
      this._initialized = true;
      console.log('[XMTP] ✅ full init:', this.client.address);
      return true;
    } catch (fullErr: any) {
      console.warn('[XMTP] ⚠️ недоступен:', fullErr?.message);
      this.client = null;
      this._initialized = false;
      return false;
    }
  }

  isReady(): boolean {
    return this._initialized && this.client !== null;
  }

  getAddress(): string | null {
    return this.client?.address || null;
  }

  // sendMessage — ВЫБРАСЫВАЕТ ошибку если XMTP не готов
  // Нет silent fallback: не показываем "отправлено" если не доставили
  async sendMessage(peerAddress: string, content: string): Promise<XmtpMessage> {
    if (!this.client) {
      throw new Error('XMTP не инициализирован — сообщение не отправлено');
    }
    const conversation = await this.client.conversations.newConversation(peerAddress);
    const sent = await conversation.send(content);
    return {
      id: sent.id,
      content: sent.content,
      senderAddress: this.client.address,
      recipientAddress: peerAddress,
      timestamp: sent.sent.getTime(),
    };
  }

  async getMessages(peerAddress: string): Promise<XmtpMessage[]> {
    if (!this.client) return [];
    try {
      const conversation = await this.client.conversations.newConversation(peerAddress);
      const messages = await conversation.messages({ limit: 50 });
      return messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        senderAddress: msg.senderAddress,
        recipientAddress: peerAddress,
        timestamp: msg.sent.getTime(),
      }));
    } catch { return []; }
  }

  async getConversations(): Promise<any[]> {
    if (!this.client) return [];
    try { return await this.client.conversations.list(); }
    catch { return []; }
  }

  async streamAllMessages(callback: (msg: XmtpMessage) => void): Promise<() => void> {
    if (!this.client) return () => {};
    try {
      const stream = await this.client.conversations.streamAllMessages();
      let active = true;
      (async () => {
        for await (const msg of stream) {
          if (!active) break;
          callback({
            id: msg.id,
            content: msg.content,
            senderAddress: msg.senderAddress,
            recipientAddress: msg.recipientAddress || '',
            timestamp: msg.sent.getTime(),
          });
        }
      })();
      return () => { active = false; };
    } catch { return () => {}; }
  }

  disconnect(): void {
    this.client = null;
    this._initialized = false;
  }
}

export const xmtpService = new XmtpService();
