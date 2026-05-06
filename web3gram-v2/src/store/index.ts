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
  setXmtpReady: (ready: boolean) => void;
  setXmtpAvailable: (available: boolean) => void;
  setWallet: (wallet: WalletState) => void;
  toggleAvatarSelector: () => void;
  setAvatar: (avatarId: number) => void;
  setChats: (chats: Chat[]) => void;
  upsertChat: (chat: Chat) => void;
  setActiveChat: (chatId: string | null) => void;
  addMessage: (chatId: string, message: Message) => void;
  setMessages: (chatId: string, messages: Message[]) => void;
  loadPersistedMessages: (chatId: string) => Message[];
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

// ── localStorage helpers ──────────────────────────────────────────────────
function _ls(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function _lsSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
}
function _lsDel(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

// ── Chat persistence (keyed by wallet address) ────────────────────────────
function chatsKey(address: string) {
  return `w3g_chats_${address.toLowerCase()}`;
}
function msgsKey(chatId: string) {
  return `w3g_msgs_${chatId.toLowerCase()}`;
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
  try { _lsSet(chatsKey(address), JSON.stringify(real)); } catch {}
}

function persistMessages(chatId: string, messages: Message[]) {
  if (!chatId || chatId.startsWith('mock-')) return;
  const last100 = messages.slice(-100);
  try { _lsSet(msgsKey(chatId), JSON.stringify(last100)); } catch {}
}

function _loadPersistedMsgs(chatId: string): Message[] {
  if (!chatId || chatId.startsWith('mock-')) return [];
  try {
    const raw = _ls(msgsKey(chatId));
    if (!raw) return [];
    const parsed: any[] = JSON.parse(raw);
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch { return []; }
}

// ── Bootstrap from localStorage ────────────────────────────────────────────
const savedName     = _ls('w3g_name');
const savedAvatarId = _ls('w3g_avatarId');
const savedAddress  = _ls('w3g_address');
const isDark        = _ls('theme') === 'dark';

if (typeof document !== 'undefined') {
  document.documentElement.classList.toggle('dark', isDark);
}

// ── Mock data (only shown when no wallet is connected) ────────────────────
const mockChats: Chat[] = [
  {
    id: 'mock-1',
    type: 'private',
    name: 'Демо-чат',
    avatar: 'DM',
    participants: [{ id: '1', name: 'Демо', walletAddress: '0x0', isOnline: false }],
    unreadCount: 1,
    isPinned: false,
    isMuted: false,
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(),
    lastMessage: {
      id: 'm1',
      chatId: 'mock-1',
      senderId: '1',
      content: 'Подключи кошелёк для реального чата',
      timestamp: new Date(),
      status: 'delivered',
      type: 'text',
    },
  },
];

// ── Initial state ─────────────────────────────────────────────────────────
const _initChats = loadSavedChats(savedAddress);

const _initUser: User = {
  id: 'current',
  name: savedName || 'Пользователь',
  avatar: savedName ? savedName.charAt(0).toUpperCase() : 'П',
  avatarId: savedAvatarId ? parseInt(savedAvatarId, 10) : undefined,
  walletAddress: savedAddress ?? undefined,
  isOnline: true,
};

const _initWallet: WalletState = savedAddress
  ? { isConnected: true, address: savedAddress, chainId: 137 }
  : { isConnected: false, address: null, chainId: null };

const _initE2E: E2EState = {
  isInitialized: !!savedAddress,
  xmtpReady: false,
  xmtpAvailable: false,
  contractsReady: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: _initUser,
  wallet:      _initWallet,
  chats:       _initChats,
  activeChatId: null,
  messages:    {},
  searchQuery: '',
  isSettingsOpen:   false,
  isWalletModalOpen: false,
  isDarkMode:  isDark,
  isAvatarSelectorOpen: false,
  e2e: _initE2E,

  setCurrentUser: (user) => {
    set({ currentUser: user });
    if (user) {
      if (user.name)           _lsSet('w3g_name', user.name);
      if (user.walletAddress)  _lsSet('w3g_address', user.walletAddress);
      if (user.avatarId !== undefined) _lsSet('w3g_avatarId', String(user.avatarId));
    }
  },

  setE2EInitialized: (initialized) =>
    set((s) => ({ e2e: { ...s.e2e, isInitialized: initialized } })),

  setXmtpReady: (ready) =>
    set((s) => ({ e2e: { ...s.e2e, xmtpReady: ready } })),

  setXmtpAvailable: (available) =>
    set((s) => ({ e2e: { ...s.e2e, xmtpAvailable: available } })),

  setWallet: (wallet) => {
    set({ wallet });
    if (wallet.address) {
      _lsSet('w3g_address', wallet.address);
      // If switching to a new address load its saved chats
      const { chats } = get();
      const hasReal = chats.some((c) => !c.id.startsWith('mock-'));
      if (!hasReal) {
        const saved = loadSavedChats(wallet.address);
        if (saved.length > 0) set({ chats: saved });
      }
    } else {
      _lsDel('w3g_address');
      set({ chats: mockChats, messages: {}, activeChatId: null, e2e: { isInitialized: false, xmtpReady: false, xmtpAvailable: false, contractsReady: false } });
    }
  },

  toggleDarkMode: () => {
    const newMode = !get().isDarkMode;
    set({ isDarkMode: newMode });
    document.documentElement.classList.toggle('dark', newMode);
    _lsSet('theme', newMode ? 'dark' : 'light');
  },

  toggleAvatarSelector: () =>
    set((s) => ({ isAvatarSelectorOpen: !s.isAvatarSelectorOpen })),

  setAvatar: (avatarId) => {
    const { currentUser } = get();
    if (currentUser) {
      set({ currentUser: { ...currentUser, avatarId } });
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

  setMessages: (chatId, msgs) => {
    set((s) => ({ messages: { ...s.messages, [chatId]: msgs } }));
    persistMessages(chatId, msgs);
  },

  loadPersistedMessages: (chatId) => _loadPersistedMsgs(chatId),

  // Только mock- чаты удаляем; реальные остаются
  clearMockData: () => {
    const { chats, messages, wallet } = get();
    const realChats = chats.filter((c) => !c.id.startsWith('mock-'));
    const realMessages: Record<string, Message[]> = {};
    Object.keys(messages).forEach((k) => {
      if (!k.startsWith('mock-')) realMessages[k] = messages[k];
    });
    set({ chats: realChats, messages: realMessages });
    persistChats(wallet.address, realChats);
  },

  setActiveChat: (chatId) => {
    if (chatId) get().markChatAsRead(chatId);
    set({ activeChatId: chatId });
  },

  addMessage: (chatId, message) => {
    const { messages, chats } = get();
    const existing = messages[chatId] || [];
    if (existing.some((m) => m.id === message.id)) return;
    const updated = [...existing, message];
    set({
      messages: { ...messages, [chatId]: updated },
      chats: chats.map((chat) =>
        chat.id === chatId
          ? { ...chat, lastMessage: message, updatedAt: message.timestamp }
          : chat
      ),
    });
    persistMessages(chatId, updated);
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
  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
  toggleWalletModal: () => set((s) => ({ isWalletModalOpen: !s.isWalletModalOpen })),

  markChatAsRead: (chatId) =>
    set((s) => ({
      chats: s.chats.map((c) => c.id === chatId ? { ...c, unreadCount: 0 } : c),
    })),

  pinChat: (chatId) =>
    set((s) => ({
      chats: s.chats.map((c) => c.id === chatId ? { ...c, isPinned: !c.isPinned } : c),
    })),

  muteChat: (chatId) =>
    set((s) => ({
      chats: s.chats.map((c) => c.id === chatId ? { ...c, isMuted: !c.isMuted } : c),
    })),

  deleteChat: (chatId) => {
    const { chats, messages, activeChatId, wallet } = get();
    const newMessages = { ...messages };
    delete newMessages[chatId];
    const newChats = chats.filter((c) => c.id !== chatId);
    set({ chats: newChats, messages: newMessages, activeChatId: activeChatId === chatId ? null : activeChatId });
    persistChats(wallet.address, newChats);
    _lsDel(msgsKey(chatId));
  },
}));
