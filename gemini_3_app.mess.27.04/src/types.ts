export interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
  isMe: boolean;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'last seen recently';
}

export interface Chat {
  id: string;
  user: User;
  lastMessage: Message;
  unreadCount: number;
}
