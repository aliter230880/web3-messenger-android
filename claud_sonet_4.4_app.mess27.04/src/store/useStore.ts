import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  encrypted?: boolean;
  type: 'text' | 'image' | 'file' | 'system';
  read?: boolean;
}

export interface Chat {
  id: string;
  type: 'dm' | 'group';
  name?: string;
  participants: string[];
  messages: Message[];
  lastMessage?: Message;
  unread: number;
  avatar?: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}

export interface Contact {
  address: string;
  name?: string;
  ens?: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'away';
  lastSeen?: number;
}

export interface AppState {
  // Wallet
  walletAddress: string | null;
  walletConnected: boolean;
  ensName: string | null;
  networkName: string | null;

  // UI
  activeChatId: string | null;
  sidebarOpen: boolean;
  currentView: 'chats' | 'contacts' | 'settings' | 'new-chat' | 'profile';
  searchQuery: string;
  theme: 'dark' | 'light';

  // Data
  chats: Chat[];
  contacts: Contact[];
  pinnedChats: string[];

  // Actions - Wallet
  setWallet: (address: string, network: string) => void;
  setEns: (ens: string) => void;
  disconnectWallet: () => void;

  // Actions - UI
  setActiveChat: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setView: (view: AppState['currentView']) => void;
  setSearchQuery: (q: string) => void;
  toggleTheme: () => void;

  // Actions - Data
  addChat: (chat: Chat) => void;
  updateChat: (id: string, update: Partial<Chat>) => void;
  deleteChat: (id: string) => void;
  addMessage: (chatId: string, message: Message) => void;
  markAsRead: (chatId: string) => void;
  pinChat: (chatId: string) => void;
  unpinChat: (chatId: string) => void;
  addContact: (contact: Contact) => void;
  updateContact: (address: string, update: Partial<Contact>) => void;
}

const generateId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// Demo data
const DEMO_ADDRESS = '0x742d35Cc6634C0532925a3b8D4C9B7F3c5A2b8E9';
const DEMO_CHATS: Chat[] = [
  {
    id: 'chat-1',
    type: 'dm',
    participants: [DEMO_ADDRESS, '0x1234567890abcdef1234567890abcdef12345678'],
    messages: [
      {
        id: 'msg-1',
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: DEMO_ADDRESS,
        content: '👋 Привет! Как дела?',
        timestamp: Date.now() - 3600000 * 2,
        type: 'text',
        read: true,
      },
      {
        id: 'msg-2',
        from: DEMO_ADDRESS,
        to: '0x1234567890abcdef1234567890abcdef12345678',
        content: 'Всё отлично! Видел новый дроп?',
        timestamp: Date.now() - 3600000,
        type: 'text',
        read: true,
      },
      {
        id: 'msg-3',
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: DEMO_ADDRESS,
        content: 'Да! Минтил утром 🔥 Gas был безумный',
        timestamp: Date.now() - 1800000,
        type: 'text',
        read: false,
      },
    ],
    unread: 1,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 1800000,
  },
  {
    id: 'chat-2',
    type: 'group',
    name: 'DeFi Alpha 🚀',
    participants: [
      DEMO_ADDRESS,
      '0xabcdef1234567890abcdef1234567890abcdef12',
      '0x9876543210fedcba9876543210fedcba98765432',
      '0xdeadbeef1234567890abcdef1234567890abcdef',
    ],
    messages: [
      {
        id: 'msg-g1',
        from: '0xabcdef1234567890abcdef1234567890abcdef12',
        to: 'chat-2',
        content: 'Ребята, ETH пробил 4k!',
        timestamp: Date.now() - 600000,
        type: 'text',
        read: false,
      },
      {
        id: 'msg-g2',
        from: '0x9876543210fedcba9876543210fedcba98765432',
        to: 'chat-2',
        content: 'LETS GOOO 🚀🚀🚀',
        timestamp: Date.now() - 300000,
        type: 'text',
        read: false,
      },
    ],
    unread: 3,
    createdAt: Date.now() - 7 * 86400000,
    updatedAt: Date.now() - 300000,
  },
  {
    id: 'chat-3',
    type: 'dm',
    participants: [DEMO_ADDRESS, '0xabcdef1234567890abcdef1234567890abcdef12'],
    messages: [
      {
        id: 'msg-c1',
        from: '0xabcdef1234567890abcdef1234567890abcdef12',
        to: DEMO_ADDRESS,
        content: 'Можешь глянуть мой портфель? 👀',
        timestamp: Date.now() - 86400000,
        type: 'text',
        read: true,
      },
    ],
    unread: 0,
    createdAt: Date.now() - 3 * 86400000,
    updatedAt: Date.now() - 86400000,
  },
  {
    id: 'chat-4',
    type: 'group',
    name: 'NFT Collectors 🎨',
    participants: [DEMO_ADDRESS, '0x1234567890abcdef1234567890abcdef12345678', '0x9876543210fedcba9876543210fedcba98765432'],
    messages: [
      {
        id: 'msg-n1',
        from: '0x9876543210fedcba9876543210fedcba98765432',
        to: 'chat-4',
        content: 'Кто-то видел последний Bored Ape?',
        timestamp: Date.now() - 7200000,
        type: 'text',
        read: true,
      },
    ],
    unread: 0,
    createdAt: Date.now() - 14 * 86400000,
    updatedAt: Date.now() - 7200000,
    pinned: true,
  },
];

const DEMO_CONTACTS: Contact[] = [
  {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    name: 'CryptoKing',
    ens: 'cryptoking.eth',
    status: 'online',
  },
  {
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    name: 'DeFi Wizard',
    ens: 'defiwizard.eth',
    status: 'away',
    lastSeen: Date.now() - 300000,
  },
  {
    address: '0x9876543210fedcba9876543210fedcba98765432',
    name: 'NFT Hunter',
    status: 'offline',
    lastSeen: Date.now() - 3600000,
  },
  {
    address: '0xdeadbeef1234567890abcdef1234567890abcdef',
    name: 'Satoshi_Fan',
    ens: 'satoshi.eth',
    status: 'online',
  },
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      walletAddress: null,
      walletConnected: false,
      ensName: null,
      networkName: null,
      activeChatId: null,
      sidebarOpen: true,
      currentView: 'chats',
      searchQuery: '',
      theme: 'dark',
      chats: DEMO_CHATS,
      contacts: DEMO_CONTACTS,
      pinnedChats: ['chat-4'],

      setWallet: (address, network) =>
        set({ walletAddress: address, walletConnected: true, networkName: network }),

      setEns: (ens) => set({ ensName: ens }),

      disconnectWallet: () =>
        set({
          walletAddress: null,
          walletConnected: false,
          ensName: null,
          networkName: null,
          activeChatId: null,
          currentView: 'chats',
        }),

      setActiveChat: (id) => {
        set({ activeChatId: id });
        if (id) {
          get().markAsRead(id);
        }
      },

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setView: (view) => set({ currentView: view }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      addChat: (chat) =>
        set((s) => ({ chats: [chat, ...s.chats] })),

      updateChat: (id, update) =>
        set((s) => ({
          chats: s.chats.map((c) => (c.id === id ? { ...c, ...update } : c)),
        })),

      deleteChat: (id) =>
        set((s) => ({
          chats: s.chats.filter((c) => c.id !== id),
          activeChatId: s.activeChatId === id ? null : s.activeChatId,
        })),

      addMessage: (chatId, message) =>
        set((s) => ({
          chats: s.chats.map((c) => {
            if (c.id !== chatId) return c;
            const messages = [...c.messages, message];
            return {
              ...c,
              messages,
              lastMessage: message,
              updatedAt: message.timestamp,
              unread:
                message.from !== s.walletAddress
                  ? c.unread + 1
                  : c.unread,
            };
          }),
        })),

      markAsRead: (chatId) =>
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  unread: 0,
                  messages: c.messages.map((m) => ({ ...m, read: true })),
                }
              : c
          ),
        })),

      pinChat: (chatId) =>
        set((s) => ({
          pinnedChats: [...s.pinnedChats, chatId],
        })),

      unpinChat: (chatId) =>
        set((s) => ({
          pinnedChats: s.pinnedChats.filter((id) => id !== chatId),
        })),

      addContact: (contact) =>
        set((s) => ({
          contacts: [contact, ...s.contacts.filter((c) => c.address !== contact.address)],
        })),

      updateContact: (address, update) =>
        set((s) => ({
          contacts: s.contacts.map((c) =>
            c.address === address ? { ...c, ...update } : c
          ),
        })),
    }),
    {
      name: 'web3-messenger-storage',
      partialize: (state) => ({
        theme: state.theme,
        contacts: state.contacts,
        pinnedChats: state.pinnedChats,
      }),
    }
  )
);

export { generateId };
