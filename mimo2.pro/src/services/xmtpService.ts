// XMTP Service - с timeout, retry и skipContactPublishing
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
  private isInitialized = false;
  private initAttempts = 0;
  private maxAttempts = 3;

  // Инициализация с timeout и retry
  async initialize(signer: ethers.Signer): Promise<boolean> {
    if (this.isInitialized && this.client) {
      return true;
    }

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      this.initAttempts = attempt;
      console.log(`XMTP: Init attempt ${attempt}/${this.maxAttempts}`);

      try {
        const success = await this.tryInit(signer);
        if (success) return true;
      } catch (error: any) {
        console.error(`XMTP: Attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.maxAttempts) {
          // Ждём перед retry
          await new Promise(r => setTimeout(r, 1500 * attempt));
        }
      }
    }

    console.error('XMTP: All attempts failed');
    return false;
  }

  // Попытка инициализации с timeout
  private async tryInit(signer: ethers.Signer): Promise<boolean> {
    // Динамический импорт
    let Client;
    try {
      const xmtp = await import('@xmtp/xmtp-js');
      Client = xmtp.Client;
    } catch {
      console.error('XMTP: Library not available');
      return false;
    }

    console.log('XMTP: Creating client...');

    // Timeout 4 секунды
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('XMTP timeout')), 4000)
    );

    try {
      this.client = await Promise.race([
        Client.create(signer, {
          env: 'production',
          skipContactPublishing: true, // Экономит 1-2 секунды!
        }),
        timeoutPromise,
      ]);

      this.isInitialized = true;
      console.log('XMTP: Connected! Address:', this.client.address);
      return true;
    } catch (error: any) {
      console.error('XMTP: Init error:', error.message);
      this.client = null;
      this.isInitialized = false;
      return false;
    }
  }

  // Проверка готовности
  isReady(): boolean {
    return this.isInitialized && this.client !== null;
  }

  // Отправить сообщение (БЕЗ fake fallback!)
  async sendMessage(peerAddress: string, content: string): Promise<XmtpMessage> {
    if (!this.client) {
      throw new Error('XMTP not initialized - message not sent');
    }

    console.log('XMTP: Sending to', peerAddress);
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

  // Получить сообщения
  async getMessages(peerAddress: string, limit: number = 50): Promise<XmtpMessage[]> {
    if (!this.client) return [];

    try {
      const conversation = await this.client.conversations.newConversation(peerAddress);
      const messages = await conversation.messages({ limit });

      return messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        senderAddress: msg.senderAddress,
        recipientAddress: msg.recipientAddress || peerAddress,
        timestamp: msg.sent.getTime(),
      }));
    } catch {
      return [];
    }
  }

  // Подписка на ВСЕ сообщения
  async streamAllMessages(callback: (msg: XmtpMessage) => void): Promise<() => void> {
    if (!this.client) throw new Error('XMTP not initialized');

    const stream = await this.client.conversations.streamAllMessages();

    (async () => {
      try {
        for await (const msg of stream) {
          callback({
            id: msg.id,
            content: msg.content,
            senderAddress: msg.senderAddress,
            recipientAddress: msg.recipientAddress || '',
            timestamp: msg.sent.getTime(),
          });
        }
      } catch (error) {
        console.error('XMTP: Stream error:', error);
      }
    })();

    return () => {};
  }

  // Проверка может ли адрес получать XMTP
  async canMessage(address: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      return await this.client.canMessage(address);
    } catch {
      return false;
    }
  }

  // Отключение
  disconnect(): void {
    this.client = null;
    this.isInitialized = false;
    this.initAttempts = 0;
  }

  // Получить адрес
  getAddress(): string | null {
    return this.client?.address || null;
  }
}

export const xmtpService = new XmtpService();
