import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
}

export interface AppState {
  // Wallet (не сохраняется полностью - только адрес)
  wallet: WalletState;
  setWallet: (wallet: Partial<WalletState>) => void;
  disconnectWallet: () => void;
  
  // Current User (сохраняется)
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  
  // Chats (сохраняется)
  chats: Chat[];
  activeChat: string | null;
  setActiveChat: (chatId: string | null) => void;
  addChat: (chat: Chat) => void;
  addMessage: (chatId: string, message: Message) => void;
  markAsRead: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  
  // Theme (сохраняется)
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
    (set, get) => ({
      // Wallet
      wallet: initialWalletState,
      setWallet: (wallet) => set((state) => ({ wallet: { ...state.wallet, ...wallet } })),
      disconnectWallet: () => set({ 
        wallet: initialWalletState, 
        currentUser: null,
      }),
      
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
      addMessage: (chatId, message) => set((state) => {
        const chatIndex = state.chats.findIndex(c => c.id === chatId);
        if (chatIndex === -1) return state;
        
        const chat = state.chats[chatIndex];
        if (chat.messages.some(m => m.id === message.id)) return state;
        
        const updatedChat = {
          ...chat,
          messages: [...chat.messages, message],
          lastMessage: message.content,
          lastMessageTime: message.timestamp,
        };
        
        return {
          chats: [updatedChat, ...state.chats.filter(c => c.id !== chatId)]
        };
      }),
      markAsRead: (chatId) => set((state) => ({
        chats: state.chats.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c)
      })),
      deleteChat: (chatId) => set((state) => ({
        chats: state.chats.filter(c => c.id !== chatId),
        activeChat: state.activeChat === chatId ? null : state.activeChat,
      })),
      
      // Theme
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'web3gram-v2',
      partialize: (state) => ({
        chats: state.chats,
        theme: state.theme,
        currentUser: state.currentUser,
        activeChat: state.activeChat,
        // Сохраняем isConnected и address для авто-подключения
        _savedWallet: {
          address: state.wallet.address,
          type: state.wallet.walletType,
          isConnected: state.wallet.isConnected,
        },
      }),
      // Восстановление
      merge: (persistedState: any, currentState) => {
        const saved = persistedState?._savedWallet;
        return {
          ...currentState,
          ...persistedState,
          wallet: {
            ...currentState.wallet,
            address: saved?.address || null,
            walletType: saved?.type || null,
            // isConnected будет false пока не reconnect
          },
        };
      },
    }
  )
);
