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
  private conversations: Map<string, any> = new Map();
  private Client: any = null;

  // Динамический импорт XMTP
  private async loadXmtp() {
    if (this.Client) return this.Client;
    try {
      const xmtp = await import('@xmtp/xmtp-js');
      this.Client = xmtp.Client;
      return this.Client;
    } catch (error) {
      console.error('Failed to load XMTP:', error);
      throw new Error('XMTP library not available');
    }
  }

  // Инициализация XMTP клиента
  async initialize(signer: ethers.Signer): Promise<boolean> {
    try {
      console.log('XMTP: Loading library...');
      const Client = await this.loadXmtp();
      
      console.log('XMTP: Initializing client...');
      
      // Просто ждём сколько нужно - без timeout
      this.client = await Client.create(signer, { env: 'production' });
      
      this.isInitialized = true;
      console.log('XMTP: Initialized for address', this.client.address);
      
      return true;
    } catch (error) {
      console.error('XMTP initialization failed:', error);
      this.isInitialized = false;
      this.client = null;
      return false;
    }
  }

  // Проверка статуса
  isReady(): boolean {
    return this.isInitialized && this.client !== null;
  }

  // Проверка может ли адрес принимать XMTP сообщения
  async canMessage(peerAddress: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      return await this.client.canMessage(peerAddress);
    } catch {
      return false;
    }
  }

  // Получить или создать диалог
  async getConversation(peerAddress: string): Promise<any> {
    if (!this.client) throw new Error('XMTP not initialized');
    
    if (this.conversations.has(peerAddress)) {
      return this.conversations.get(peerAddress);
    }
    
    const conversation = await this.client.conversations.newConversation(peerAddress);
    this.conversations.set(peerAddress, conversation);
    
    return conversation;
  }

  // Отправить сообщение
  async sendMessage(peerAddress: string, content: string): Promise<XmtpMessage> {
    if (!this.client) throw new Error('XMTP not initialized');
    
    const conversation = await this.getConversation(peerAddress);
    const sent = await conversation.send(content);
    
    return {
      id: sent.id,
      content: sent.content,
      senderAddress: this.client.address,
      recipientAddress: peerAddress,
      timestamp: sent.sent.getTime(),
    };
  }

  // Получить сообщения из диалога
  async getMessages(peerAddress: string, limit: number = 50): Promise<XmtpMessage[]> {
    if (!this.client) return [];
    
    try {
      const conversation = await this.getConversation(peerAddress);
      const messages = await conversation.messages({ limit });
      
      return messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        senderAddress: msg.senderAddress,
        recipientAddress: msg.recipientAddress || peerAddress,
        timestamp: msg.sent.getTime(),
      }));
    } catch (error) {
      console.error('Failed to get messages:', error);
      return [];
    }
  }

  // Подписка на новые сообщения в диалоге
  async subscribeToConversation(
    peerAddress: string,
    callback: (message: XmtpMessage) => void
  ): Promise<() => void> {
    if (!this.client) throw new Error('XMTP not initialized');
    
    const conversation = await this.getConversation(peerAddress);
    const stream = await conversation.streamMessages();
    
    const processStream = async () => {
      try {
        for await (const msg of stream) {
          callback({
            id: msg.id,
            content: msg.content,
            senderAddress: msg.senderAddress,
            recipientAddress: msg.recipientAddress || peerAddress,
            timestamp: msg.sent.getTime(),
          });
        }
      } catch (error) {
        console.error('Stream error:', error);
      }
    };
    
    processStream();
    
    return () => {
      try {
        stream.return(undefined);
      } catch {}
    };
  }

  // Подписка на ВСЕ новые сообщения
  async subscribeToAllMessages(
    callback: (message: XmtpMessage) => void
  ): Promise<() => void> {
    if (!this.client) throw new Error('XMTP not initialized');
    
    const stream = await this.client.conversations.streamAllMessages();
    
    const processStream = async () => {
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
        console.error('All messages stream error:', error);
      }
    };
    
    processStream();
    
    return () => {
      try {
        stream.return(undefined);
      } catch {}
    };
  }

  // Список всех диалогов
  async listConversations(): Promise<string[]> {
    if (!this.client) return [];
    
    try {
      const conversations = await this.client.conversations.list();
      return conversations.map((c: any) => c.peerAddress);
    } catch {
      return [];
    }
  }

  // Отключение
  disconnect(): void {
    this.client = null;
    this.isInitialized = false;
    this.conversations.clear();
  }

  // Получить адрес текущего пользователя
  getAddress(): string | null {
    return this.client?.address || null;
  }
}

export const xmtpService = new XmtpService();
