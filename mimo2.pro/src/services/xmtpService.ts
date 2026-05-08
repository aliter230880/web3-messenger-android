// XMTP Service - упрощённая версия
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

  // Инициализация с обработкой ошибок
  async initialize(signer: ethers.Signer): Promise<boolean> {
    if (this.isInitialized && this.client) {
      return true;
    }

    try {
      console.log('XMTP: Trying to initialize...');
      
      // Пробуем импортировать XMTP
      let Client;
      try {
        const xmtp = await import('@xmtp/xmtp-js');
        Client = xmtp.Client;
      } catch (importError) {
        console.error('XMTP: Import failed, library not available');
        return false;
      }

      console.log('XMTP: Creating client...');
      
      // Создаём клиента
      this.client = await Client.create(signer, {
        env: 'production',
      });

      this.isInitialized = true;
      console.log('XMTP: Success! Address:', this.client.address);
      return true;
      
    } catch (error: any) {
      console.error('XMTP: Init error:', error?.message || error);
      this.isInitialized = false;
      this.client = null;
      return false;
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.client !== null;
  }

  async sendMessage(peerAddress: string, content: string): Promise<XmtpMessage> {
    if (!this.client) {
      // Если XMTP не доступен - возвращаем mock сообщение
      return {
        id: `local_${Date.now()}`,
        content,
        senderAddress: 'local',
        recipientAddress: peerAddress,
        timestamp: Date.now(),
      };
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
        recipientAddress: msg.recipientAddress || peerAddress,
        timestamp: msg.sent.getTime(),
      }));
    } catch {
      return [];
    }
  }

  async streamAllMessages(callback: (msg: XmtpMessage) => void): Promise<() => void> {
    if (!this.client) {
      return () => {};
    }

    try {
      const stream = await this.client.conversations.streamAllMessages();
      
      (async () => {
        for await (const msg of stream) {
          callback({
            id: msg.id,
            content: msg.content,
            senderAddress: msg.senderAddress,
            recipientAddress: msg.recipientAddress || '',
            timestamp: msg.sent.getTime(),
          });
        }
      })();

      return () => {};
    } catch {
      return () => {};
    }
  }

  disconnect(): void {
    this.client = null;
    this.isInitialized = false;
  }

  getAddress(): string | null {
    return this.client?.address || null;
  }
}

export const xmtpService = new XmtpService();
