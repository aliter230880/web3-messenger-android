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
  setActiveChat: (chatId: string | null) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateMessageStatus: (chatId: string, messageId: string, status: Message['status']) => void;
  setSearchQuery: (query: string) => void;
  toggleSettings: () => void;
  toggleWalletModal: () => void;
  markChatAsRead: (chatId: string) => void;
  pinChat: (chatId: string) => void;
  muteChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
}

// ─── Read persisted values from localStorage on module load ──────────────────
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

// Apply dark mode immediately (before React renders)
if (typeof document !== 'undefined') {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockUsers: User[] = [
  { id: '1', name: 'Алексей Петров', avatar: 'AP', walletAddress: '0x742d...8a9f', isOnline: true },
  { id: '2', name: 'Мария Иванова', avatar: 'МИ', walletAddress: '0x8b3c...4d2e', isOnline: false, lastSeen: new Date(Date.now() - 3600000) },
  { id: '3', name: 'Crypto Trader', avatar: 'CT', walletAddress: '0x1a2b...7c8d', isOnline: true },
  { id: '4', name: 'NFT Collector', avatar: 'NC', walletAddress: '0x9e8f...3a4b', isOnline: true },
  { id: '5', name: 'DeFi Expert', avatar: 'DE', walletAddress: '0x5c6d...1e2f', isOnline: false, lastSeen: new Date(Date.now() - 7200000) },
];

const mockChats: Chat[] = [
  {
    id: '1', type: 'private', name: 'Алексей Петров', avatar: 'AP',
    participants: [mockUsers[0]], unreadCount: 2, isPinned: true, isMuted: false,
    createdAt: new Date(Date.now() - 86400000), updatedAt: new Date(),
    lastMessage: { id: 'm1', chatId: '1', senderId: '1', content: 'Привет! Как дела с проектом?', timestamp: new Date(), status: 'delivered', type: 'text' },
  },
  {
    id: '2', type: 'private', name: 'Мария Иванова', avatar: 'МИ',
    participants: [mockUsers[1]], unreadCount: 0, isPinned: false, isMuted: false,
    createdAt: new Date(Date.now() - 172800000), updatedAt: new Date(Date.now() - 3600000),
    lastMessage: { id: 'm2', chatId: '2', senderId: 'current', content: 'Отправил тебе файлы', timestamp: new Date(Date.now() - 3600000), status: 'read', type: 'text' },
  },
  {
    id: '3', type: 'group', name: 'Web3 Developers', avatar: 'WD',
    participants: [mockUsers[2], mockUsers[3], mockUsers[4]], unreadCount: 15, isPinned: true, isMuted: false,
    createdAt: new Date(Date.now() - 604800000), updatedAt: new Date(),
    lastMessage: { id: 'm3', chatId: '3', senderId: '3', content: 'Кто хочет обсудить новый смарт-контракт?', timestamp: new Date(), status: 'delivered', type: 'text' },
  },
  {
    id: '4', type: 'channel', name: 'Crypto News', avatar: 'CN',
    participants: [], unreadCount: 5, isPinned: false, isMuted: true,
    createdAt: new Date(Date.now() - 1209600000), updatedAt: new Date(Date.now() - 1800000),
    lastMessage: { id: 'm4', chatId: '4', senderId: 'system', content: 'Bitcoin достиг нового ATH! 🚀', timestamp: new Date(Date.now() - 1800000), status: 'delivered', type: 'text' },
  },
];

const mockMessages: Record<string, Message[]> = {
  '1': [
    { id: 'm1-1', chatId: '1', senderId: '1', content: 'Привет!', timestamp: new Date(Date.now() - 7200000), status: 'read', type: 'text' },
    { id: 'm1-2', chatId: '1', senderId: 'current', content: 'Привет, Алексей!', timestamp: new Date(Date.now() - 7100000), status: 'read', type: 'text' },
    { id: 'm1-3', chatId: '1', senderId: '1', content: 'Как дела с проектом?', timestamp: new Date(Date.now() - 3600000), status: 'read', type: 'text' },
    { id: 'm1-4', chatId: '1', senderId: 'current', content: 'Все отлично, почти закончил', timestamp: new Date(Date.now() - 3500000), status: 'read', type: 'text' },
    { id: 'm1-5', chatId: '1', senderId: '1', content: 'Привет! Как дела с проектом?', timestamp: new Date(), status: 'delivered', type: 'text' },
  ],
  '2': [
    { id: 'm2-1', chatId: '2', senderId: '2', content: 'Можешь отправить файлы?', timestamp: new Date(Date.now() - 7200000), status: 'read', type: 'text' },
    { id: 'm2-2', chatId: '2', senderId: 'current', content: 'Отправил тебе файлы', timestamp: new Date(Date.now() - 3600000), status: 'read', type: 'text' },
  ],
  '3': [
    { id: 'm3-1', chatId: '3', senderId: '3', content: 'Всем привет!', timestamp: new Date(Date.now() - 3600000), status: 'read', type: 'text' },
    { id: 'm3-2', chatId: '3', senderId: '4', content: 'Привет!', timestamp: new Date(Date.now() - 3500000), status: 'read', type: 'text' },
    { id: 'm3-3', chatId: '3', senderId: '3', content: 'Кто хочет обсудить новый смарт-контракт?', timestamp: new Date(), status: 'delivered', type: 'text' },
  ],
  '4': [
    { id: 'm4-1', chatId: '4', senderId: 'system', content: 'Добро пожаловать в канал Crypto News!', timestamp: new Date(Date.now() - 86400000), status: 'read', type: 'text' },
    { id: 'm4-2', chatId: '4', senderId: 'system', content: 'Bitcoin достиг нового ATH! 🚀', timestamp: new Date(Date.now() - 1800000), status: 'delivered', type: 'text' },
  ],
};

// ─── Initial user — restored from localStorage if available ──────────────────
const _initUser: User = {
  id: 'current',
  name: savedName || 'Пользователь',
  avatar: savedName ? savedName.charAt(0).toUpperCase() : 'П',
  avatarId: savedAvatarId ? parseInt(savedAvatarId, 10) : undefined,
  walletAddress: savedAddress,
  isOnline: true,
};

// ─── Initial wallet — restored as read-only if address was saved ──────────────
const _initWallet: WalletState = savedAddress
  ? { isConnected: true, address: savedAddress, chainId: 137 }
  : { isConnected: false, address: null, chainId: null };

// ─────────────────────────────────────────────────────────────────────────────

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

  // ── setCurrentUser — also persists name + walletAddress ──────────────────
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

  // ── setWallet — also persists address ────────────────────────────────────
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

  // ── setAvatar — also persists avatarId ───────────────────────────────────
  setAvatar: (avatarId) => {
    const { currentUser } = get();
    if (currentUser) {
      const updated = { ...currentUser, avatar: undefined, avatarId };
      set({ currentUser: updated });
      _lsSet('w3g_avatarId', String(avatarId));
    }
  },

  setChats: (chats) => set({ chats }),

  setActiveChat: (chatId) => {
    if (chatId) get().markChatAsRead(chatId);
    set({ activeChatId: chatId });
  },

  addMessage: (chatId, message) => {
    const { messages, chats } = get();
    set({
      messages: { ...messages, [chatId]: [...(messages[chatId] || []), message] },
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
