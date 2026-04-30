import { Client } from '@xmtp/xmtp-js';
import type { Signer } from 'ethers';

export class XMTPService {
  private client: Client | null = null;
  private static instance: XMTPService;

  private constructor() {}

  static getInstance(): XMTPService {
    if (!XMTPService.instance) {
      XMTPService.instance = new XMTPService();
    }
    return XMTPService.instance;
  }

  /**
   * Инициализация XMTP клиента
   */
  async initialize(signer: Signer): Promise<void> {
    try {
      this.client = await Client.create(signer, {
        env: 'production', // production для mainnet, dev для testnet
      });
      console.log('✅ XMTP клиент инициализирован');
    } catch (error) {
      console.error('❌ Ошибка инициализации XMTP:', error);
      throw error;
    }
  }

  /**
   * Проверка инициализации
   */
  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Получение адреса клиента
   */
  getAddress(): string | null {
    return this.client?.address || null;
  }

  /**
   * Отправка сообщения
   */
  async sendMessage(recipientAddress: string, message: string): Promise<string> {
    if (!this.client) {
      throw new Error('XMTP клиент не инициализирован');
    }

    try {
      // Создание или получение диалога
      const conversation = await this.client.conversations.newConversation(recipientAddress);
      
      // Отправка сообщения
      const sentMessage = await conversation.send(message);
      
      console.log('✅ Сообщение отправлено:', sentMessage.id);
      return sentMessage.id;
    } catch (error) {
      console.error('❌ Ошибка отправки сообщения:', error);
      throw error;
    }
  }

  /**
   * Получение списка диалогов
   */
  async getConversations() {
    if (!this.client) {
      throw new Error('XMTP клиент не инициализирован');
    }

    try {
      const conversations = await this.client.conversations.list();
      return conversations;
    } catch (error) {
      console.error('❌ Ошибка получения диалогов:', error);
      throw error;
    }
  }

  /**
   * Получение сообщений из диалога
   */
  async getMessages(recipientAddress: string, limit: number = 100) {
    if (!this.client) {
      throw new Error('XMTP клиент не инициализирован');
    }

    try {
      const conversation = await this.client.conversations.newConversation(recipientAddress);
      const messages = await conversation.messages({ limit });
      
      // Сортировка по времени (новые сверху)
      return messages.sort((a, b) => b.sent.getTime() - a.sent.getTime());
    } catch (error) {
      console.error('❌ Ошибка получения сообщений:', error);
      throw error;
    }
  }

  /**
   * Подписка на новые сообщения
   */
  async subscribeToMessages(recipientAddress: string, callback: (message: any) => void) {
    if (!this.client) {
      throw new Error('XMTP клиент не инициализирован');
    }

    try {
      const conversation = await this.client.conversations.newConversation(recipientAddress);
      
      // Подписка на новые сообщения
      const stream = await conversation.streamMessages();
      
      // Асинхронное чтение сообщений из стрима
      (async () => {
        for await (const message of stream) {
          callback(message);
        }
      })();

      return stream;
    } catch (error) {
      console.error('❌ Ошибка подписки на сообщения:', error);
      throw error;
    }
  }

  /**
   * Получение всех новых сообщений со всех диалогов
   */
  async getAllNewMessages(callback: (conversation: any, message: any) => void) {
    if (!this.client) {
      throw new Error('XMTP клиент не инициализирован');
    }

    try {
      const stream = await this.client.conversations.streamAllMessages();
      
      (async () => {
        for await (const message of stream) {
          const conversation = await this.client?.conversations.newConversation(message.senderAddress);
          callback(conversation, message);
        }
      })();

      return stream;
    } catch (error) {
      console.error('❌ Ошибка получения новых сообщений:', error);
      throw error;
    }
  }

  /**
   * Проверка может ли пользователь получить сообщение (есть ли у него XMTP)
   */
  async canMessage(address: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const canMessage = await Client.canMessage(address, { env: 'production' });
      return canMessage;
    } catch (error) {
      console.error('❌ Ошибка проверки XMTP:', error);
      return false;
    }
  }

  /**
   * Отключение клиента
   */
  async disconnect() {
    if (this.client) {
      // XMTP v13 не имеет dispose, просто очищаем
      this.client = null;
      console.log('🔌 XMTP клиент отключён');
    }
  }
}

// Экспорт singleton instance
export const xmtpService = XMTPService.getInstance();
