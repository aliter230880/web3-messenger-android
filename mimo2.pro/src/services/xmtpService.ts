// XMTP Service - с динамическим импортом для совместимости
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
  private Client: any = null;

  // Динамический импорт XMTP
  private async loadXmtp() {
    if (this.Client) return this.Client;
    try {
      const xmtp = await import('@xmtp/xmtp-js');
      this.Client = xmtp.Client;
      return this.Client;
    } catch (error) {
      console.error('XMTP: Failed to load library:', error);
      throw error;
    }
  }

  // Инициализация
  async initialize(signer: ethers.Signer): Promise<boolean> {
    if (this.isInitialized && this.client) {
      console.log('XMTP: Already initialized');
      return true;
    }

    try {
      console.log('XMTP: Loading library...');
      const Client = await this.loadXmtp();
      
      console.log('XMTP: Creating client...');
      this.client = await Client.create(signer, {
        env: 'production',
      });

      this.isInitialized = true;
      console.log('XMTP: Initialized! Address:', this.client.address);
      return true;
    } catch (error: any) {
      console.error('XMTP: Init failed:', error.message);
      this.isInitialized = false;
      this.client = null;
      return false;
    }
  }

  // Проверка готовности
  isReady(): boolean {
    return this.isInitialized && this.client !== null;
  }

  // Отправить сообщение
  async sendMessage(peerAddress: string, content: string): Promise<XmtpMessage> {
    if (!this.client) throw new Error('XMTP not initialized');

    console.log('XMTP: Sending to', peerAddress);
    const conversation = await this.client.conversations.newConversation(peerAddress);
    const sent = await conversation.send(content);
    
    console.log('XMTP: Sent!', sent.id);
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
    } catch (error) {
      console.error('XMTP: Get messages error:', error);
      return [];
    }
  }

  // Подписка на ВСЕ сообщения
  async streamAllMessages(
    callback: (message: XmtpMessage) => void
  ): Promise<() => void> {
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

    // Возвращаем функцию отписки
    return () => {
      console.log('XMTP: Unsubscribing');
    };
  }

  // Отключение
  disconnect(): void {
    this.client = null;
    this.isInitialized = false;
    console.log('XMTP: Disconnected');
  }

  // Получить адрес
  getAddress(): string | null {
    return this.client?.address || null;
  }
}

export const xmtpService = new XmtpService();
