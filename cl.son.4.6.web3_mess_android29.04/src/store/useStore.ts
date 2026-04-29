import { create } from 'zustand';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderAddress: string;
  senderName: string;
  content: string;
  timestamp: number;
  status: MessageStatus;
  type: 'text' | 'system';
  replyTo?: string;
}

export interface Chat {
  id: string;
  type: 'private' | 'group' | 'channel';
  name: string;
  address?: string;
  avatar?: string;
  lastMessage?: Message;
  unreadCount: number;
  members?: string[];
  isOnline?: boolean;
  lastSeen?: number;
  description?: string;
  pinned?: boolean;
  muted?: boolean;
}

export interface User {
  address: string;
  name: string;
  avatar?: string;
  bio?: string;
  isOnline: boolean;
  lastSeen?: number;
}

export interface Wallet {
  address: string;
  balance: string;
  chainId: number;
  networkName: string;
}

type Panel = 'chats' | 'contacts' | 'settings' | 'search';

interface AppState {
  // Auth
  wallet: Wallet | null;
  user: User | null;
  isConnecting: boolean;
  
  // Chats
  chats: Chat[];
  activeChat: Chat | null;
  messages: Record<string, Message[]>;
  
  // UI
  activePanel: Panel;
  sidebarOpen: boolean;
  searchQuery: string;
  typingUsers: Record<string, string[]>;
  
  // Contacts
  contacts: User[];
  
  // Actions
  setWallet: (wallet: Wallet | null) => void;
  setUser: (user: User | null) => void;
  setIsConnecting: (v: boolean) => void;
  setActiveChat: (chat: Chat | null) => void;
  setActivePanel: (panel: Panel) => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
  addMessage: (chatId: string, msg: Message) => void;
  updateMessage: (chatId: string, msgId: string, updates: Partial<Message>) => void;
  setMessages: (chatId: string, msgs: Message[]) => void;
  setChats: (chats: Chat[]) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  addChat: (chat: Chat) => void;
  setTypingUsers: (chatId: string, users: string[]) => void;
  setContacts: (contacts: User[]) => void;
  markAsRead: (chatId: string) => void;
}

export const useStore = create<AppState>((set) => ({
  wallet: null,
  user: null,
  isConnecting: false,
  chats: [],
  activeChat: null,
  messages: {},
  activePanel: 'chats',
  sidebarOpen: false,
  searchQuery: '',
  typingUsers: {},
  contacts: [],

  setWallet: (wallet) => set({ wallet }),
  setUser: (user) => set({ user }),
  setIsConnecting: (isConnecting) => set({ isConnecting }),
  setActiveChat: (activeChat) => set({ activeChat }),
  setActivePanel: (activePanel) => set({ activePanel }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  addMessage: (chatId, msg) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: [...(state.messages[chatId] || []), msg],
      },
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, lastMessage: msg } : c
      ),
    })),

  updateMessage: (chatId, msgId, updates) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((m) =>
          m.id === msgId ? { ...m, ...updates } : m
        ),
      },
    })),

  setMessages: (chatId, msgs) =>
    set((state) => ({
      messages: { ...state.messages, [chatId]: msgs },
    })),

  setChats: (chats) => set({ chats }),

  updateChat: (chatId, updates) =>
    set((state) => ({
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, ...updates } : c)),
      activeChat:
        state.activeChat?.id === chatId
          ? { ...state.activeChat, ...updates }
          : state.activeChat,
    })),

  addChat: (chat) =>
    set((state) => ({
      chats: [chat, ...state.chats],
    })),

  setTypingUsers: (chatId, users) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [chatId]: users },
    })),

  setContacts: (contacts) => set({ contacts }),

  markAsRead: (chatId) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, unreadCount: 0 } : c
      ),
    })),
}));
