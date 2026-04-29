import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import nacl from 'tweetnacl';
import {
  getAccountData, setAccountData, getContactsData, setContactsData,
  deriveKeyHash, shortAddr,
  connectMetaMask, deriveE2EKeyPair,
  encryptMessage, decryptMessage,
  getCachedMessages, setCachedMessages,
  NEW_MESSAGE_ABI,
} from '../utils/web3';
import type { Contact, Message, Chat, AppScreen } from '../types';


interface AppContextType {
  // Auth state
  screen: AppScreen;
  setScreen: (s: AppScreen) => void;
  userAddress: string;
  username: string;
  isAuthenticated: boolean;
  hasMetaMask: boolean;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  e2eKeyPair: nacl.BoxKeyPair | null;
  avatarId: number | null;

  // Chat state
  contacts: Contact[];
  chats: Chat[];
  activeChat: string | null;
  messages: Message[];
  loading: boolean;
  sending: boolean;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Actions
  loginWithMetaMask: () => Promise<boolean>;
  loginWithPassword: (addr: string, password: string) => Promise<boolean>;
  registerAccount: (addr: string, username: string, password: string) => Promise<boolean>;
  logout: () => void;
  selectChat: (addr: string) => void;
  sendMessage: (text: string) => Promise<void>;
  addContact: (addr: string, name: string) => void;
  removeContact: (addr: string) => void;
  refreshChats: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  updateProfile: (username: string, newAvatarId: number | null) => void;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<AppScreen>('splash');
  const [userAddress, setUserAddress] = useState('');
  const [username, setUsername] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasMetaMask] = useState(() => typeof window.ethereum !== 'undefined');
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [e2eKeyPair, setE2eKeyPair] = useState<nacl.BoxKeyPair | null>(null);
  const [avatarId, setAvatarId] = useState<number | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeChatRef = useRef<string | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadContactsAndChats = useCallback((addr: string) => {
    const stored = getContactsData(addr);
    setContacts(stored);

    // Build chats list from contacts + cached messages
    const chatList: Chat[] = stored.map((c: Contact) => {
      const msgs = getCachedMessages(addr, c.address);
      const last = msgs[msgs.length - 1];
      return {
        address: c.address,
        name: c.name || shortAddr(c.address),
        lastMessage: last ? (last.isMine ? `Вы: ${last.text}` : last.text) : '',
        lastTime: last ? last.timestamp : 0,
        unread: 0,
        avatarId: c.avatarId ?? null,
      };
    });
    chatList.sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
    setChats(chatList);
  }, []);

  const afterAuth = useCallback(async (addr: string, prov: ethers.providers.Web3Provider | null, sign: ethers.Signer | null) => {
    const account = getAccountData(addr);
    const uname = account?.username || shortAddr(addr);
    setUsername(uname);
    setAvatarId(account?.avatarId ?? null);
    setIsAuthenticated(true);
    loadContactsAndChats(addr);
    setScreen('chats');
  }, [loadContactsAndChats]);

  const loginWithMetaMask = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const result = await connectMetaMask();
      if (!result) {
        showToast('MetaMask не найден или отклонён', 'error');
        return false;
      }
      const { provider: prov, signer: sign, address } = result;
      setProvider(prov);
      setSigner(sign);
      setUserAddress(address);

      // Try to derive E2E keypair
      try {
        const kp = await deriveE2EKeyPair(sign);
        setE2eKeyPair(kp);
      } catch { /* ignore */ }

      // Check if registered locally
      const account = getAccountData(address);
      if (!account) {
        // Auto-register without password for MetaMask users
        const hash = await deriveKeyHash('metamask-' + address, address);
        setAccountData(address, {
          username: shortAddr(address),
          keyHash: hash,
          avatarId: null,
        });
      }

      await afterAuth(address, prov, sign);
      showToast('Подключён: ' + shortAddr(address), 'success');
      return true;
    } catch (e) {
      showToast('Ошибка подключения', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [afterAuth, showToast]);

  const loginWithPassword = useCallback(async (addr: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      if (!ethers.utils.isAddress(addr)) {
        showToast('Неверный адрес кошелька', 'error');
        return false;
      }
      const account = getAccountData(addr);
      if (!account) {
        showToast('Аккаунт не найден. Зарегистрируйтесь', 'error');
        return false;
      }
      const hash = await deriveKeyHash(password, addr);
      if (hash !== account.keyHash) {
        showToast('Неверный пароль', 'error');
        return false;
      }
      setUserAddress(addr);
      await afterAuth(addr, null, null);
      showToast('Добро пожаловать, ' + (account.username || shortAddr(addr)) + '!', 'success');
      return true;
    } finally {
      setLoading(false);
    }
  }, [afterAuth, showToast]);

  const registerAccount = useCallback(async (addr: string, uname: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      if (!ethers.utils.isAddress(addr)) {
        showToast('Неверный адрес кошелька', 'error');
        return false;
      }
      if (!uname.trim()) {
        showToast('Введите имя пользователя', 'error');
        return false;
      }
      if (password.length < 6) {
        showToast('Пароль минимум 6 символов', 'error');
        return false;
      }
      const hash = await deriveKeyHash(password, addr);
      setAccountData(addr, {
        username: uname.trim(),
        keyHash: hash,
        avatarId: null,
      });
      setUserAddress(addr);
      await afterAuth(addr, null, null);
      showToast('Аккаунт создан! Добро пожаловать, ' + uname + '!', 'success');
      return true;
    } finally {
      setLoading(false);
    }
  }, [afterAuth, showToast]);

  const logout = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setIsAuthenticated(false);
    setUserAddress('');
    setUsername('');
    setProvider(null);
    setSigner(null);
    setE2eKeyPair(null);
    setContacts([]);
    setChats([]);
    setMessages([]);
    setActiveChat(null);
    activeChatRef.current = null;
    setScreen('welcome');
  }, []);

  const loadMessagesForChat = useCallback(async (peerAddr: string, currentUserAddr: string) => {
    // Load from cache first
    const cached = getCachedMessages(currentUserAddr, peerAddr);
    if (cached.length > 0) {
      setMessages(cached);
    }

    // Try to fetch from blockchain if signer is available
    if (signer && provider) {
      try {
        const contractAddr = localStorage.getItem('w3m_msg_contract') || '';
        if (contractAddr && ethers.utils.isAddress(contractAddr)) {
          const contract = new ethers.Contract(contractAddr, NEW_MESSAGE_ABI, signer);
          const rawMsgs = await contract.getMessages(peerAddr);

          const decoded: Message[] = [];
          for (const m of rawMsgs) {
            const senderAddr: string = m.sender;
            const recipientAddr: string = m.recipient;
            const rawText: string = m.text;
            const ts: number = m.timestamp.toNumber();

            // Determine if this message is part of our conversation
            const isMine = senderAddr.toLowerCase() === currentUserAddr.toLowerCase();
            const isRelevant =
              (senderAddr.toLowerCase() === currentUserAddr.toLowerCase() && recipientAddr.toLowerCase() === peerAddr.toLowerCase()) ||
              (senderAddr.toLowerCase() === peerAddr.toLowerCase() && recipientAddr.toLowerCase() === currentUserAddr.toLowerCase());

            if (!isRelevant) continue;

            let text = rawText;
            try {
              const decPeer = isMine ? peerAddr : senderAddr;
              const dec = await decryptMessage(rawText, currentUserAddr, decPeer, e2eKeyPair);
              if (dec) text = dec;
            } catch { /* keep raw */ }

            decoded.push({ sender: senderAddr, recipient: recipientAddr, text, timestamp: ts, isMine });
          }

          decoded.sort((a, b) => a.timestamp - b.timestamp);
          setCachedMessages(currentUserAddr, peerAddr, decoded);
          setMessages(decoded);
        }
      } catch { /* use cache */ }
    }
  }, [signer, provider, e2eKeyPair]);

  const selectChat = useCallback((addr: string) => {
    setActiveChat(addr);
    activeChatRef.current = addr;

    // Load cached messages immediately
    const cached = getCachedMessages(userAddress, addr);
    setMessages(cached);

    setScreen('chat');
    loadMessagesForChat(addr, userAddress);
  }, [userAddress, loadMessagesForChat]);

  const refreshMessages = useCallback(async () => {
    if (!activeChat || !userAddress) return;
    await loadMessagesForChat(activeChat, userAddress);
  }, [activeChat, userAddress, loadMessagesForChat]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !activeChat || !userAddress) return;
    setSending(true);

    const tempMsg: Message = {
      sender: userAddress,
      recipient: activeChat,
      text: text.trim(),
      timestamp: Math.floor(Date.now() / 1000),
      isMine: true,
      pending: true,
    };

    setMessages(prev => [...prev, tempMsg]);

    try {
      if (signer && provider) {
        const contractAddr = localStorage.getItem('w3m_msg_contract') || '';
        if (contractAddr && ethers.utils.isAddress(contractAddr)) {
          const encrypted = await encryptMessage(text.trim(), userAddress, activeChat, e2eKeyPair);
          const contract = new ethers.Contract(contractAddr, NEW_MESSAGE_ABI, signer);
          const tx = await contract.sendMessage(activeChat, encrypted);
          await tx.wait();

          const confirmed: Message = { ...tempMsg, pending: false };
          setMessages(prev => prev.map(m => m === tempMsg ? confirmed : m));
          const updated = [...getCachedMessages(userAddress, activeChat).filter(m => !m.pending), confirmed];
          setCachedMessages(userAddress, activeChat, updated);
          showToast('Сообщение отправлено on-chain ✓', 'success');
        } else {
          // Demo mode - save locally
          const confirmed: Message = { ...tempMsg, pending: false };
          setMessages(prev => prev.map(m => m === tempMsg ? confirmed : m));
          const prev = getCachedMessages(userAddress, activeChat);
          setCachedMessages(userAddress, activeChat, [...prev, confirmed]);
          showToast('Сохранено локально (контракт не настроен)', 'info');
        }
      } else {
        // No wallet - save locally
        const confirmed: Message = { ...tempMsg, pending: false };
        setMessages(prev => prev.map(m => m === tempMsg ? confirmed : m));
        const prev = getCachedMessages(userAddress, activeChat);
        setCachedMessages(userAddress, activeChat, [...prev, confirmed]);
      }

      // Update chat list
      setChats(prev => {
        const existing = prev.find(c => c.address.toLowerCase() === activeChat.toLowerCase());
        const contact = contacts.find(c => c.address.toLowerCase() === activeChat.toLowerCase());
        const updated: Chat = {
          address: activeChat,
          name: existing?.name || contact?.name || shortAddr(activeChat),
          lastMessage: 'Вы: ' + text.trim(),
          lastTime: tempMsg.timestamp,
          unread: 0,
          avatarId: existing?.avatarId ?? null,
        };
        const others = prev.filter(c => c.address.toLowerCase() !== activeChat.toLowerCase());
        return [updated, ...others];
      });
    } catch (e: any) {
      setMessages(prev => prev.map(m => m === tempMsg ? { ...m, pending: false, failed: true } : m));
      showToast('Ошибка отправки: ' + (e?.reason || e?.message || 'Неизвестная ошибка'), 'error');
    } finally {
      setSending(false);
    }
  }, [activeChat, userAddress, signer, provider, e2eKeyPair, contacts, showToast]);

  const addContact = useCallback((addr: string, name: string) => {
    if (!ethers.utils.isAddress(addr)) {
      showToast('Неверный адрес', 'error');
      return;
    }
    const existing = contacts.find(c => c.address.toLowerCase() === addr.toLowerCase());
    if (existing) {
      showToast('Контакт уже добавлен', 'info');
      return;
    }
    const newContact: Contact = { address: addr, name: name || shortAddr(addr) };
    const updated = [...contacts, newContact];
    setContacts(updated);
    setContactsData(userAddress, updated);

    // Add to chats
    setChats(prev => {
      const exists = prev.find(c => c.address.toLowerCase() === addr.toLowerCase());
      if (exists) return prev;
      return [{ address: addr, name: newContact.name, lastMessage: '', lastTime: 0, unread: 0 }, ...prev];
    });
    showToast('Контакт добавлен: ' + newContact.name, 'success');
  }, [contacts, userAddress, showToast]);

  const removeContact = useCallback((addr: string) => {
    const updated = contacts.filter(c => c.address.toLowerCase() !== addr.toLowerCase());
    setContacts(updated);
    setContactsData(userAddress, updated);
    showToast('Контакт удалён', 'info');
  }, [contacts, userAddress, showToast]);

  const refreshChats = useCallback(async () => {
    loadContactsAndChats(userAddress);
  }, [userAddress, loadContactsAndChats]);

  const updateProfile = useCallback((newUsername: string, newAvatarId: number | null) => {
    const account = getAccountData(userAddress) || {};
    account.username = newUsername;
    account.avatarId = newAvatarId;
    setAccountData(userAddress, account);
    setUsername(newUsername);
    setAvatarId(newAvatarId);
    showToast('Профиль обновлён', 'success');
  }, [userAddress, showToast]);

  return (
    <AppContext.Provider value={{
      screen, setScreen,
      userAddress, username, isAuthenticated, hasMetaMask,
      provider, signer, e2eKeyPair, avatarId,
      contacts, chats, activeChat, messages, loading, sending,
      searchQuery, setSearchQuery,
      loginWithMetaMask, loginWithPassword, registerAccount, logout,
      selectChat, sendMessage,
      addContact, removeContact,
      refreshChats, refreshMessages,
      updateProfile,
      toast, showToast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
