export interface Contact {
  address: string;
  name: string;
  avatarId?: number | null;
}

export interface Message {
  id?: string;
  sender: string;
  recipient: string;
  text: string;
  timestamp: number;
  isMine: boolean;
  pending?: boolean;
  failed?: boolean;
}

export interface Chat {
  address: string;
  name: string;
  lastMessage?: string;
  lastTime?: number;
  unread?: number;
  avatarId?: number | null;
  online?: boolean;
}

export interface AccountData {
  username: string;
  keyHash: string;
  avatarId?: number | null;
  encryptedSig?: string;
}

export type AppScreen =
  | 'splash'
  | 'welcome'
  | 'login'
  | 'register'
  | 'chats'
  | 'chat'
  | 'profile'
  | 'contacts'
  | 'settings'
  | 'newChat';

export type FolderType = 'all' | 'personal' | 'groups';
