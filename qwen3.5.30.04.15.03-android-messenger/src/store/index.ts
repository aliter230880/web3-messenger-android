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

// Mock data for demonstration
const mockUsers: User[] = [
  { id: '1', name: 'Алексей Петров', avatar: 'AP', walletAddress: '0x742d...8a9f', isOnline: true },
  { id: '2', name: 'Мария Иванова', avatar: 'МИ', walletAddress: '0x8b3c...4d2e', isOnline: false, lastSeen: new Date(Date.now() - 3600000) },
  { id: '3', name: 'Crypto Trader', avatar: 'CT', walletAddress: '0x1a2b...7c8d', isOnline: true },
  { id: '4', name: 'NFT Collector', avatar: 'NC', walletAddress: '0x9e8f...3a4b', isOnline: true },
  { id: '5', name: 'DeFi Expert', avatar: 'DE', walletAddress: '0x5c6d...1e2f', isOnline: false, lastSeen: new Date(Date.now() - 7200000) },
];

const mockChats: Chat[] = [
  {
    id: '1',
    type: 'private',
    name: 'Алексей Петров',
    avatar: 'AP',
    participants: [mockUsers[0]],
    unreadCount: 2,
    isPinned: true,
    isMuted: false,
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(),
    lastMessage: {
      id: 'm1',
      chatId: '1',
      senderId: '1',
      content: 'Привет! Как дела с проектом?',
      timestamp: new Date(),
      status: 'delivered',
      type: 'text',
    },
  },
  {
    id: '2',
    type: 'private',
    name: 'Мария Иванова',
    avatar: 'МИ',
    participants: [mockUsers[1]],
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(Date.now() - 3600000),
    lastMessage: {
      id: 'm2',
      chatId: '2',
      senderId: 'current',
      content: 'Отправил тебе файлы',
      timestamp: new Date(Date.now() - 3600000),
      status: 'read',
      type: 'text',
    },
  },
  {
    id: '3',
    type: 'group',
    name: 'Web3 Developers',
    avatar: 'WD',
    participants: [mockUsers[2], mockUsers[3], mockUsers[4]],
    unreadCount: 15,
    isPinned: true,
    isMuted: false,
    createdAt: new Date(Date.now() - 604800000),
    updatedAt: new Date(),
    lastMessage: {
      id: 'm3',
      chatId: '3',
      senderId: '3',
      content: 'Кто хочет обсудить новый смарт-контракт?',
      timestamp: new Date(),
      status: 'delivered',
      type: 'text',
    },
  },
  {
    id: '4',
    type: 'channel',
    name: 'Crypto News',
    avatar: 'CN',
    participants: [],
    unreadCount: 5,
    isPinned: false,
    isMuted: true,
    createdAt: new Date(Date.now() - 1209600000),
    updatedAt: new Date(Date.now() - 1800000),
    lastMessage: {
      id: 'm4',
      chatId: '4',
      senderId: 'system',
      content: 'Bitcoin достиг нового ATH! 🚀',
      timestamp: new Date(Date.now() - 1800000),
      status: 'delivered',
      type: 'text',
    },
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

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: {
    id: 'current',
    name: 'Пользователь',
    avatar: 'П',
    walletAddress: null,
    isOnline: true,
  },
  wallet: {
    isConnected: false,
    address: null,
    chainId: null,
  },
  chats: mockChats,
  activeChatId: null,
  messages: mockMessages,
  searchQuery: '',
  isSettingsOpen: false,
  isWalletModalOpen: false,
  isDarkMode: typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark',
  isAvatarSelectorOpen: false,
  e2e: {
    isInitialized: false,
    xmtpReady: false,
    contractsReady: false,
  },
  
  setCurrentUser: (user) => set({ currentUser: user }),
  
  setE2EInitialized: (initialized) => set((state) => ({
    e2e: { ...state.e2e, isInitialized: initialized }
  })),
  
  setWallet: (wallet) => set({ wallet }),
  
  toggleDarkMode: () => {
    const newMode = !get().isDarkMode;
    set({ isDarkMode: newMode });
    
    // Применяем класс к documentElement
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    console.log('🌓 Тема переключена:', newMode ? 'тёмная' : 'светлая');
  },
  
  toggleAvatarSelector: () => set((state) => ({ isAvatarSelectorOpen: !state.isAvatarSelectorOpen })),
  
  setAvatar: (avatarId) => {
    const { currentUser } = get();
    if (currentUser) {
      set({
        currentUser: {
          ...currentUser,
          avatar: undefined,
          avatarId,
        },
      });
    }
  },
  
  setChats: (chats) => set({ chats }),
  
  setActiveChat: (chatId) => {
    if (chatId) {
      get().markChatAsRead(chatId);
    }
    set({ activeChatId: chatId });
  },
  
  addMessage: (chatId, message) => {
    const { messages, chats } = get();
    const chatMessages = messages[chatId] || [];
    
    set({
      messages: {
        ...messages,
        [chatId]: [...chatMessages, message],
      },
      chats: chats.map((chat) =>
        chat.id === chatId
          ? { ...chat, lastMessage: message, updatedAt: message.timestamp }
          : chat
      ),
    });
  },
  
  updateMessageStatus: (chatId, messageId, status) => {
    const { messages } = get();
    const chatMessages = messages[chatId] || [];
    
    set({
      messages: {
        ...messages,
        [chatId]: chatMessages.map((msg) =>
          msg.id === messageId ? { ...msg, status } : msg
        ),
      },
    });
  },
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  
  toggleWalletModal: () => set((state) => ({ isWalletModalOpen: !state.isWalletModalOpen })),
  
  markChatAsRead: (chatId) => {
    const { chats } = get();
    set({
      chats: chats.map((chat) =>
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      ),
    });
  },
  
  pinChat: (chatId) => {
    const { chats } = get();
    set({
      chats: chats.map((chat) =>
        chat.id === chatId ? { ...chat, isPinned: !chat.isPinned } : chat
      ),
    });
  },
  
  muteChat: (chatId) => {
    const { chats } = get();
    set({
      chats: chats.map((chat) =>
        chat.id === chatId ? { ...chat, isMuted: !chat.isMuted } : chat
      ),
    });
  },
  
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
