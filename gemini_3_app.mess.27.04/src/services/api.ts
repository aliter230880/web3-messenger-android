import { io, Socket } from 'socket.io-client';
import { Chat, Message } from '../types';

export const API_BASE_URL = 'https://api.aliterra.space';
export const SOCKET_URL = 'https://api.aliterra.space';

class ApiService {
  private socket: Socket | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  constructor() {
    this.initSocket();
  }

  public initSocket() {
    this.socket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('auth_token'),
      },
    });

    this.socket.on('message', (message: Message) => {
      this.trigger('message', message);
    });

    this.socket.on('connect', () => {
      console.log('Connected to backend');
      this.trigger('connection_change', true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from backend');
      this.trigger('connection_change', false);
    });
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  private trigger(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  async getChats(): Promise<Chat[]> {
    try {
      // const response = await axios.get(`${API_BASE_URL}/chats`);
      // return response.data;
      
      // Returning mock for now, but ready for real API
      return []; 
    } catch (error) {
      console.error('Error fetching chats:', error);
      return [];
    }
  }

  async sendMessage(chatId: string, text: string): Promise<Message> {
    try {
      // Real socket emit
      if (this.socket) {
        this.socket.emit('send_message', { chatId, text });
      }
      console.log('Sending message to chat:', chatId);

      return {
        id: Date.now().toString(),
        text,
        senderId: 'me',
        timestamp: new Date(),
        isMe: true,
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async getMessages(chatId: string): Promise<Message[]> {
    try {
      console.log('Fetching messages for:', chatId);
      return [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }
}

export const apiService = new ApiService();
