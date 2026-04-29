import { Chat, User } from './types';

export const currentUser: User = {
  id: 'me',
  name: 'John Doe',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
  status: 'online',
};

export const mockChats: Chat[] = [
  {
    id: '1',
    user: {
      id: 'u1',
      name: 'Telegram',
      avatar: 'https://telegram.org/img/t_logo.png',
      status: 'online',
    },
    lastMessage: {
      id: 'm1',
      text: 'Login from a new device',
      senderId: 'u1',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      isMe: false,
    },
    unreadCount: 1,
  },
  {
    id: '2',
    user: {
      id: 'u2',
      name: 'Saved Messages',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=SM&backgroundColor=24a1de',
      status: 'online',
    },
    lastMessage: {
      id: 'm2',
      text: 'Project links and notes',
      senderId: 'me',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      isMe: true,
    },
    unreadCount: 0,
  },
  {
    id: '3',
    user: {
      id: 'u3',
      name: 'Alice Freeman',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
      status: 'online',
    },
    lastMessage: {
      id: 'm3',
      text: 'See you tomorrow!',
      senderId: 'u3',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      isMe: false,
    },
    unreadCount: 2,
  },
  {
    id: '4',
    user: {
      id: 'u4',
      name: 'Crypto News',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Crypto',
      status: 'last seen recently',
    },
    lastMessage: {
      id: 'm4',
      text: 'BTC reached a new ATH! 🚀',
      senderId: 'u4',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      isMe: false,
    },
    unreadCount: 15,
  },
  {
    id: '5',
    user: {
      id: 'u5',
      name: 'Development Group',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=DG&backgroundColor=f59e0b',
      status: 'online',
    },
    lastMessage: {
      id: 'm5',
      text: 'John: The build is passing now.',
      senderId: 'u5',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
      isMe: false,
    },
    unreadCount: 0,
  },
];
