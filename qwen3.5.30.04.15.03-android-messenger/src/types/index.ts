export interface User {
  id: string;
  name: string;
  avatar?: string;
  avatarId?: number;
  walletAddress?: string | null;
  /** ERC-4337 smart-wallet address from LoginFactory (may equal walletAddress if not yet deployed) */
  smartWalletAddress?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file' | 'voice';
  replyTo?: string;
}

export interface Chat {
  id: string;
  type: 'private' | 'group' | 'channel';
  name: string;
  avatar?: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  balance?: string;
  signer?: any;
  provider?: any;
}

export interface E2EState {
  isInitialized: boolean;
  publicKey?: string;
  xmtpReady: boolean;
  contractsReady: boolean;
}

export interface AppState {
  currentUser: User | null;
  wallet: WalletState;
  chats: Chat[];
  activeChatId: string | null;
  messages: Record<string, Message[]>;
  searchQuery: string;
  isSettingsOpen: boolean;
}
