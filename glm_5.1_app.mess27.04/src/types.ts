export interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  isMe: boolean;
  status: 'sent' | 'delivered' | 'read';
  replyTo?: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'typing';
  lastSeen?: number;
  bio?: string;
}

export interface Chat {
  id: string;
  user: User;
  messages: Message[];
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  lastActivity: number;
}

export type Screen = 'chats' | 'settings' | 'newChat' | 'profile';
