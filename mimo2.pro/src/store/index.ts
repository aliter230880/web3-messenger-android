import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Contact {
  address: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount?: number;
  isOnline?: boolean;
  isTyping?: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  senderAddress: string;
  receiverAddress: string;
  content: string;
  timestamp: number;
  isSent: boolean;
  isDelivered?: boolean;
  isRead?: boolean;
  isEncrypted?: boolean;
}

export interface Chat {
  id: string;
  contactAddress: string;
  contactName: string;
  contactAvatar?: string;
  messages: Message[];
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: number;
  isOnline?: boolean;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  signer: any;
  provider: any;
  walletType: string | null;
  isReadOnly: boolean;
}

export interface AppState {
  // Wallet
  wallet: WalletState;
  setWallet: (wallet: Partial<WalletState>) => void;
  disconnectWallet: () => void;
  
  // Current User
  currentUser: { id: string; name: string; avatar?: string } | null;
  setCurrentUser: (user: { id: string; name: string; avatar?: string } | null) => void;
  
  // Chats
  chats: Chat[];
  activeChat: string | null;
  setActiveChat: (chatId: string | null) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  addMessage: (chatId: string, message: Message) => void;
  markAsRead: (chatId: string) => void;
  
  // UI State
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isWalletModalOpen: boolean;
  setWalletModalOpen: (open: boolean) => void;
  isNewChatModalOpen: boolean;
  setNewChatModalOpen: (open: boolean) => void;
  isProfileModalOpen: boolean;
  setProfileModalOpen: (open: boolean) => void;
  
  // XMTP Status
  xmtpReady: boolean;
  xmtpAvailable: boolean;
  setXmtpReady: (ready: boolean) => void;
  setXmtpAvailable: (available: boolean) => void;
  
  // E2E
  e2eInitialized: boolean;
  setE2EInitialized: (initialized: boolean) => void;
  
  // Error handling
  error: string | null;
  setError: (error: string | null) => void;
  
  // Theme
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

const initialWalletState: WalletState = {
  isConnected: false,
  address: null,
  chainId: null,
  signer: null,
  provider: null,
  walletType: null,
  isReadOnly: false,
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Wallet
      wallet: initialWalletState,
      setWallet: (wallet) => set((state) => ({ wallet: { ...state.wallet, ...wallet } })),
      disconnectWallet: () => set({ wallet: initialWalletState, currentUser: null, e2eInitialized: false, xmtpReady: false, xmtpAvailable: false }),
      
      // Current User
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      
      // Chats
      chats: [],
      activeChat: null,
      setActiveChat: (chatId) => set({ activeChat: chatId }),
      addChat: (chat) => set((state) => ({
        chats: [chat, ...state.chats.filter(c => c.id !== chat.id)]
      })),
      updateChat: (chatId, updates) => set((state) => ({
        chats: state.chats.map(c => c.id === chatId ? { ...c, ...updates } : c)
      })),
      addMessage: (chatId, message) => set((state) => {
        const chatIndex = state.chats.findIndex(c => c.id === chatId);
        if (chatIndex === -1) {
          // Create new chat
          const newChat: Chat = {
            id: chatId,
            contactAddress: message.receiverAddress === state.wallet.address ? message.senderAddress : message.receiverAddress,
            contactName: message.receiverAddress === state.wallet.address ? message.senderAddress.slice(0, 8) + '...' : message.receiverAddress.slice(0, 8) + '...',
            messages: [message],
            unreadCount: message.senderAddress !== state.wallet.address ? 1 : 0,
            lastMessage: message.content,
            lastMessageTime: message.timestamp,
          };
          return { chats: [newChat, ...state.chats] };
        }
        
        const existingChat = state.chats[chatIndex];
        const messageExists = existingChat.messages.some(m => m.id === message.id);
        if (messageExists) return state;
        
        const updatedChat = {
          ...existingChat,
          messages: [...existingChat.messages, message].sort((a, b) => a.timestamp - b.timestamp),
          lastMessage: message.content,
          lastMessageTime: message.timestamp,
          unreadCount: message.senderAddress !== state.wallet.address 
            ? (existingChat.unreadCount || 0) + 1 
            : existingChat.unreadCount,
        };
        
        return {
          chats: [updatedChat, ...state.chats.filter(c => c.id !== chatId)]
        };
      }),
      markAsRead: (chatId) => set((state) => ({
        chats: state.chats.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c)
      })),
      
      // UI State
      isSidebarOpen: true,
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      isWalletModalOpen: false,
      setWalletModalOpen: (open) => set({ isWalletModalOpen: open }),
      isNewChatModalOpen: false,
      setNewChatModalOpen: (open) => set({ isNewChatModalOpen: open }),
      isProfileModalOpen: false,
      setProfileModalOpen: (open) => set({ isProfileModalOpen: open }),
      
      // XMTP Status
      xmtpReady: false,
      xmtpAvailable: false,
      setXmtpReady: (ready) => set({ xmtpReady: ready }),
      setXmtpAvailable: (available) => set({ xmtpAvailable: available }),
      
      // E2E
      e2eInitialized: false,
      setE2EInitialized: (initialized) => set({ e2eInitialized: initialized }),
      
      // Error handling
      error: null,
      setError: (error) => set({ error }),
      
      // Theme
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'web3gram-storage',
      partialize: (state) => ({
        chats: state.chats,
        theme: state.theme,
        currentUser: state.currentUser,
      }),
    }
  )
);
