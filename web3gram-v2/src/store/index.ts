import { create } from 'zustand';
import type { User, Chat, Message, WalletState, E2EState } from '../types';

interface AppState {
  currentUser: User | null;
  wallet: WalletState;
  chats: Chat[];
  activeChatId: string | null;
  messages: Record<string, Message[]>;
  searchQuery: string;
  isSettingsOpen: boolean;
  isWalletModalOpen: boolean;
  isDarkMode: boolean;
  isAvatarSelectorOpen: boolean;
  e2e: E2EState;

  // Actions
  setCurrentUser: (user: User | null) => void;
  toggleDarkMode: () => void;
  setE2EInitialized: (initialized: boolean) => void;
  setWallet: (wallet: WalletState) => void;
  toggleAvatarSelector: () => void;
  setAvatar: (avatarId: number) => void;
  setChats: (chats: Chat[]) => void;
  upsertChat: (chat: Chat) => void;
  setActiveChat: (chatId: string | null) => void;
  addMessage: (chatId: string, message: Message) => void;
  setMessages: (chatId: string, messages: Message[]) => void;
  clearMockData: () => void;
  updateMessageStatus: (chatId: string, messageId: string, status: Message['status']) => void;
  setSearchQuery: (query: string) => void;
  toggleSettings: () => void;
  toggleWalletModal: () => void;
  markChatAsRead: (chatId: string) => void;
  pinChat: (chatId: string) => void;
  muteChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
}

function _ls(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function _lsSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
}
function _lsDel(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

const savedName    = _ls('w3g_name');
const savedAvatarId = _ls('w3g_avatarId');
const savedAddress = _ls('w3g_address');
const isDark       = _ls('theme') === 'dark';

if (typeof document !== 'undefined') {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

const mockUsers: User[] = [
  { id: '1', name: 'Алексей Петров', avatar: 'AP', walletAddress: '0x742d35Cc6634C0532925a3b8D4C9C4e07B7A5c8f', isOnline: true },
  { id: '2', name: 'Мария Иванова', avatar: 'МИ', walletAddress: '0x8b3c22Dd7745E1643036b8D5A4B8C6d7E8f92a1b', isOnline: false, lastSeen: new Date(Date.now() - 3600000) },
  { id: '3', name: 'Crypto Trader', avatar: 'CT', walletAddress: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', isOnline: true },
];

const mockChats: Chat[] = [
  {
    id: 'mock-1', type: 'private', name: 'Алексей Петров', avatar: 'AP',
    participants: [mockUsers[0]], unreadCount: 2, isPinned: true, isMuted: false,
    createdAt: new Date(Date.now() - 86400000), updatedAt: new Date(),
    lastMessage: { id: 'm1', chatId: 'mock-1', senderId: '1', content: 'Привет! Подключи кошелёк для реального чата', timestamp: new Date(), status: 'delivered', type: 'text' },
  },
];

const mockMessages: Record<string, Message[]> = {
  'mock-1': [
    { id: 'm1-1', chatId: 'mock-1', senderId: '1', content: 'Привет!', timestamp: new Date(Date.now() - 7200000), status: 'read', type: 'text' },
    { id: 'm1-2', chatId: 'mock-1', senderId: 'current', content: 'Это демо-режим. Подключи кошелёк чтобы начать реальный чат.', timestamp: new Date(Date.now() - 7100000), status: 'read', type: 'text' },
    { id: 'm1-3', chatId: 'mock-1', senderId: '1', content: 'Подключи кошелёк для реального чата', timestamp: new Date(), status: 'delivered', type: 'text' },
  ],
};

const _initUser: User = {
  id: 'current',
  name: savedName || 'Пользователь',
  avatar: savedName ? savedName.charAt(0).toUpperCase() : 'П',
  avatarId: savedAvatarId ? parseInt(savedAvatarId, 10) : undefined,
  walletAddress: savedAddress,
  isOnline: true,
};

const _initWallet: WalletState = savedAddress
  ? { isConnected: true, address: savedAddress, chainId: 137 }
  : { isConnected: false, address: null, chainId: null };

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: _initUser,
  wallet: _initWallet,
  chats: mockChats,
  activeChatId: null,
  messages: mockMessages,
  searchQuery: '',
  isSettingsOpen: false,
  isWalletModalOpen: false,
  isDarkMode: isDark,
  isAvatarSelectorOpen: false,
  e2e: {
    isInitialized: false,
    xmtpReady: false,
    contractsReady: false,
  },

  setCurrentUser: (user) => {
    set({ currentUser: user });
    if (user) {
      if (user.name)          _lsSet('w3g_name', user.name);
      if (user.walletAddress) _lsSet('w3g_address', user.walletAddress);
      if (user.avatarId !== undefined) _lsSet('w3g_avatarId', String(user.avatarId));
    }
  },

  setE2EInitialized: (initialized) =>
    set((state) => ({ e2e: { ...state.e2e, isInitialized: initialized } })),

  setWallet: (wallet) => {
    set({ wallet });
    if (wallet.address) {
      _lsSet('w3g_address', wallet.address);
    } else {
      _lsDel('w3g_address');
    }
  },

  toggleDarkMode: () => {
    const newMode = !get().isDarkMode;
    set({ isDarkMode: newMode });
    if (newMode) {
      document.documentElement.classList.add('dark');
      _lsSet('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      _lsSet('theme', 'light');
    }
  },

  toggleAvatarSelector: () =>
    set((state) => ({ isAvatarSelectorOpen: !state.isAvatarSelectorOpen })),

  setAvatar: (avatarId) => {
    const { currentUser } = get();
    if (currentUser) {
      const updated = { ...currentUser, avatar: undefined, avatarId };
      set({ currentUser: updated });
      _lsSet('w3g_avatarId', String(avatarId));
    }
  },

  setChats: (chats) => set({ chats }),

  upsertChat: (chat) => {
    const { chats } = get();
    const idx = chats.findIndex((c) => c.id === chat.id);
    if (idx >= 0) {
      const updated = [...chats];
      updated[idx] = { ...chats[idx], ...chat };
      set({ chats: updated });
    } else {
      set({ chats: [chat, ...chats] });
    }
  },

  setMessages: (chatId, msgs) =>
    set((state) => ({ messages: { ...state.messages, [chatId]: msgs } })),

  clearMockData: () =>
    set({ chats: [], messages: {}, activeChatId: null }),

  setActiveChat: (chatId) => {
    if (chatId) get().markChatAsRead(chatId);
    set({ activeChatId: chatId });
  },

  addMessage: (chatId, message) => {
    const { messages, chats } = get();
    const existing = messages[chatId] || [];
    if (existing.some((m) => m.id === message.id)) return;
    set({
      messages: { ...messages, [chatId]: [...existing, message] },
      chats: chats.map((chat) =>
        chat.id === chatId ? { ...chat, lastMessage: message, updatedAt: message.timestamp } : chat
      ),
    });
  },

  updateMessageStatus: (chatId, messageId, status) => {
    const { messages } = get();
    set({
      messages: {
        ...messages,
        [chatId]: (messages[chatId] || []).map((msg) =>
          msg.id === messageId ? { ...msg, status } : msg
        ),
      },
    });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  toggleWalletModal: () => set((state) => ({ isWalletModalOpen: !state.isWalletModalOpen })),

  markChatAsRead: (chatId) =>
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      ),
    })),

  pinChat: (chatId) =>
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, isPinned: !chat.isPinned } : chat
      ),
    })),

  muteChat: (chatId) =>
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, isMuted: !chat.isMuted } : chat
      ),
    })),

  deleteChat: (chatId) => {
    const { chats, messages, activeChatId } = get();
    const newMessages = { ...messages };
    delete newMessages[chatId];
    set({
      chats: chats.filter((chat) => chat.id !== chatId),
      messages: newMessages,
      activeChatId: activeChatId === chatId ? null : activeChatId,
    });
  },
}));
