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

// ── Chat persistence helpers (per wallet address) ─────────────────────────
function chatsKey(address: string) {
  return `w3g_chats_${address.toLowerCase()}`;
}

function loadSavedChats(address: string | null): Chat[] {
  if (!address) return mockChats;
  try {
    const raw = _ls(chatsKey(address));
    if (!raw) return [];
    const parsed: any[] = JSON.parse(raw);
    return parsed.map((c) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      lastMessage: c.lastMessage
        ? { ...c.lastMessage, timestamp: new Date(c.lastMessage.timestamp) }
        : undefined,
    }));
  } catch {
    return [];
  }
}

function persistChats(address: string | null, chats: Chat[]) {
  if (!address) return;
  const real = chats.filter((c) => !c.id.startsWith('mock-'));
  try {
    _lsSet(chatsKey(address), JSON.stringify(real));
  } catch {}
}

// ── Initial values from localStorage ─────────────────────────────────────
const savedName     = _ls('w3g_name');
const savedAvatarId = _ls('w3g_avatarId');
const savedAddress  = _ls('w3g_address');
const isDark        = _ls('theme') === 'dark';

if (typeof document !== 'undefined') {
  document.documentElement.classList.toggle('dark', isDark);
}

// ── Mock data (shown only when no wallet connected) ───────────────────────
const mockUsers: User[] = [
  { id: '1', name: 'Алексей Петров', avatar: 'AP', walletAddress: '0x742d35Cc6634C0532925a3b8D4C9C4e07B7A5c8f', isOnline: true },
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

// ── Initial state ─────────────────────────────────────────────────────────
// Если адрес сохранён → показываем сохранённые реальные чаты (или пустой список)
// Если нет → показываем демо-чат
const _initChats = loadSavedChats(savedAddress);

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

// Если адрес сохранён в localStorage — считаем инициализированным
// (полный auth flow запустится при следующем подключении, но UI разблокирован)
const _initE2E: E2EState = {
  isInitialized: !!savedAddress,
  xmtpReady: false,
  contractsReady: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: _initUser,
  wallet: _initWallet,
  chats: _initChats,
  activeChatId: null,
  messages: {},
  searchQuery: '',
  isSettingsOpen: false,
  isWalletModalOpen: false,
  isDarkMode: isDark,
  isAvatarSelectorOpen: false,
  e2e: _initE2E,

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
      // При смене адреса — подгружаем сохранённые чаты для этого адреса
      const { chats } = get();
      const hasReal = chats.some((c) => !c.id.startsWith('mock-'));
      if (!hasReal) {
        const saved = loadSavedChats(wallet.address);
        if (saved.length > 0) set({ chats: saved });
      }
    } else {
      _lsDel('w3g_address');
      // При отключении — показываем демо-чат
      set({ chats: mockChats, messages: mockMessages, activeChatId: null });
    }
  },

  toggleDarkMode: () => {
    const newMode = !get().isDarkMode;
    set({ isDarkMode: newMode });
    document.documentElement.classList.toggle('dark', newMode);
    _lsSet('theme', newMode ? 'dark' : 'light');
  },

  toggleAvatarSelector: () =>
    set((state) => ({ isAvatarSelectorOpen: !state.isAvatarSelectorOpen })),

  setAvatar: (avatarId) => {
    const { currentUser } = get();
    if (currentUser) {
      set({ currentUser: { ...currentUser, avatar: undefined, avatarId } });
      _lsSet('w3g_avatarId', String(avatarId));
    }
  },

  setChats: (chats) => {
    set({ chats });
    persistChats(get().wallet.address, chats);
  },

  upsertChat: (chat) => {
    const { chats, wallet } = get();
    const idx = chats.findIndex((c) => c.id === chat.id);
    let updated: Chat[];
    if (idx >= 0) {
      updated = [...chats];
      updated[idx] = { ...chats[idx], ...chat };
    } else {
      updated = [chat, ...chats];
    }
    set({ chats: updated });
    persistChats(wallet.address, updated);
  },

  setMessages: (chatId, msgs) =>
    set((state) => ({ messages: { ...state.messages, [chatId]: msgs } })),

  // Убираем только mock-чаты, реальные контакты остаются
  clearMockData: () => {
    const { chats, messages } = get();
    const realChats = chats.filter((c) => !c.id.startsWith('mock-'));
    const realMessages: Record<string, Message[]> = {};
    Object.keys(messages).forEach((k) => {
      if (!k.startsWith('mock-')) realMessages[k] = messages[k];
    });
    set({ chats: realChats, messages: realMessages });
  },

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
    const { chats, messages, activeChatId, wallet } = get();
    const newMessages = { ...messages };
    delete newMessages[chatId];
    const newChats = chats.filter((chat) => chat.id !== chatId);
    set({
      chats: newChats,
      messages: newMessages,
      activeChatId: activeChatId === chatId ? null : activeChatId,
    });
    persistChats(wallet.address, newChats);
  },
}));
