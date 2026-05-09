import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Edit, Phone, Video, MoreVertical, Send, Smile, Paperclip, Mic,
  Check, CheckCheck, ArrowLeft, LogOut, Wallet, Shield, Globe, Lock,
  MessageCircle, Plus, X, Loader2, Copy, CheckCircle, ExternalLink,
  Trash2, Settings, User, DollarSign, AlertCircle
} from 'lucide-react';
import { useStore, Chat, Message } from './store';
import { useWallet } from './hooks/useWallet';
import { identityService } from './services/identityService';
import { transferService } from './services/transferService';
import { xmtpService } from './services/xmtpService';

// Аватарки
const avatarOptions = [
  'ava (1)', 'ava (2)', 'ava (3)', 'ava (4)', 'ava (5)', 'ava (6)', 'ava (7)', 'ava (8)',
  'ava (9)', 'ava (10)', 'ava (11)', 'ava (12)', 'ava (13)', 'ava (14)', 'ava (15)', 'ava (16)',
  'ava (17)', 'ava (18)', 'ava (19)', 'ava (20)', 'ava (21)', 'ava (22)'
];

const getAvatarUrl = (seed: string) => {
  const index = Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % avatarOptions.length;
  return `/ava/${avatarOptions[index]}.png`;
};

const truncateAddress = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

// Иконки кошельков
const MetaMaskIcon = ({ className = "w-10 h-10" }) => <img src="/ava/metamask.png" alt="MetaMask" className={className} />;
const TrustWalletIcon = ({ className = "w-10 h-10" }) => <img src="/ava/trust.png" alt="Trust Wallet" className={className} />;
const AliTerraIcon = ({ className = "w-10 h-10" }) => <img src="/ava/aliterra.png" alt="AliTerra" className={className} />;

const formatTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'сейчас';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин`;
  if (diff < 86400000) return new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return new Date(timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

export default function App() {
  const store = useStore();
  const { connect, disconnect, error: walletError } = useWallet();
  
  const [selectedChatId, setSelectedChatId] = useState<string | null>(store.activeChat);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showAliTerraModal, setShowAliTerraModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [walletScreen, setWalletScreen] = useState<'picker' | 'connecting' | 'deeplink' | 'success'>('picker');
  const [copied, setCopied] = useState(false);
  const [newChatAddress, setNewChatAddress] = useState('');
  const [aliterraAddress, setAliterraAddress] = useState('');
  const [showChatMenu, setShowChatMenu] = useState<string | null>(null);
  const [userName, setUserName] = useState(store.currentUser?.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState('ava (1)');
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [xmtpStatus, setXmtpStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  
  // Transfer state
  const [transferAmount, setTransferAmount] = useState('');
  const [transferRecipient, setTransferRecipient] = useState('');
  const [isSendingTransfer, setIsSendingTransfer] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [maticBalance, setMaticBalance] = useState<string>('0');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentWalletAddress = store.wallet.address || '';
  const selectedChat = store.chats.find(c => c.id === selectedChatId);
  const currentMessages = selectedChat?.messages || [];

  // Автоскролл
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  // Инициализация профиля
  useEffect(() => {
    if (store.currentUser) setUserName(store.currentUser.name || '');
  }, [store.currentUser?.name]);

  // Загрузка профиля on-chain при подключении
  useEffect(() => {
    const loadProfile = async () => {
      if (store.wallet.isConnected && store.wallet.address) {
        try {
          const identity = await identityService.getIdentity(store.wallet.address);
          if (identity?.exists && identity.nickname) {
            store.setCurrentUser({
              id: store.wallet.address,
              name: identity.nickname,
              avatar: getAvatarUrl(store.wallet.address),
            });
            setUserName(identity.nickname);
          } else if (!store.currentUser) {
            store.setCurrentUser({
              id: store.wallet.address,
              name: truncateAddress(store.wallet.address),
              avatar: getAvatarUrl(store.wallet.address),
            });
          }
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      }
    };
    loadProfile();
  }, [store.wallet.isConnected, store.wallet.address]);

  // Загрузка баланса
  useEffect(() => {
    const loadBalance = async () => {
      if (store.wallet.isConnected && store.wallet.provider && store.wallet.address) {
        try {
          const balance = await transferService.getBalance(store.wallet.provider, store.wallet.address);
          setMaticBalance(parseFloat(balance).toFixed(4));
        } catch {}
      }
    };
    loadBalance();
    const interval = setInterval(loadBalance, 30000);
    return () => clearInterval(interval);
  }, [store.wallet.isConnected]);

  // Авто-подключение при запуске
  useEffect(() => {
    const autoConnect = async () => {
      try {
        const saved = localStorage.getItem('web3gram-v2');
        if (saved) {
          const data = JSON.parse(saved);
          const savedWallet = data?.state?._savedWallet;
          
          if (savedWallet?.address && !store.wallet.isConnected) {
            const ethereum = (window as any).ethereum;
            if (ethereum && savedWallet.type !== 'aliterra') {
              try {
                const accounts = await ethereum.request({ method: 'eth_accounts' });
                if (accounts?.length > 0 && accounts[0].toLowerCase() === savedWallet.address.toLowerCase()) {
                  // Авто-подключение без ethers
                  store.setWallet({
                    isConnected: true,
                    address: accounts[0],
                    chainId: 137,
                    signer: null,
                    provider: null,
                    walletType: savedWallet.type || 'metamask',
                    isReadOnly: false,
                  });
                }
              } catch {}
            }
          }
        }
      } catch {}
    };
    setTimeout(autoConnect, 500);
  }, []);

  // Инициализация XMTP (опционально, не блокирует UI)
  useEffect(() => {
    const initXmtp = async () => {
      if (!store.wallet.isConnected || !store.wallet.signer) {
        setXmtpStatus('disconnected');
        return;
      }

      if (xmtpService.isReady()) {
        setXmtpStatus('connected');
        return;
      }

      setXmtpStatus('connecting');

      try {
        const success = await xmtpService.initialize(store.wallet.signer);
        
        if (success) {
          setXmtpStatus('connected');
          console.log('XMTP: Connected!');
          
          // Подписка на входящие (в фоне)
          xmtpService.streamAllMessages((msg) => {
            const existingChat = store.chats.find(c => 
              c.contactAddress.toLowerCase() === msg.senderAddress.toLowerCase()
            );
            
            if (existingChat) {
              store.addMessage(existingChat.id, {
                id: msg.id,
                chatId: existingChat.id,
                senderAddress: msg.senderAddress,
                receiverAddress: msg.recipientAddress,
                content: msg.content,
                timestamp: msg.timestamp,
                isSent: false,
                isRead: false,
              });
            }
          }).catch(() => {});
          
        } else {
          setXmtpStatus('disconnected'); // Не ошибка, просто не доступен
        }
      } catch {
        setXmtpStatus('disconnected'); // Не ошибка
      }
    };

    // Запускаем через 2 секунды чтобы не блокировать UI
    const timeout = setTimeout(initXmtp, 2000);
    return () => clearTimeout(timeout);
  }, [store.wallet.isConnected]);

  // Отправка сообщения
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedChatId || !selectedChat) return;
    
    const content = messageInput.trim();
    const recipientAddress = selectedChat.contactAddress;
    
    // Создаём сообщение
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      chatId: selectedChatId,
      senderAddress: currentWalletAddress,
      receiverAddress: recipientAddress,
      content: content,
      timestamp: Date.now(),
      isSent: true,
      isDelivered: true, // Локально считаем доставленным
      isRead: false,
    };

    // Сохраняем в store (localStorage)
    store.addMessage(selectedChatId, newMessage);
    setMessageInput('');

    // Попытка отправить через XMTP (в фоне)
    if (xmtpService.isReady()) {
      try {
        await xmtpService.sendMessage(recipientAddress, content);
        console.log('XMTP: Message sent!');
      } catch (error) {
        console.log('XMTP: Send failed, saved locally');
      }
    }
  }, [messageInput, selectedChatId, selectedChat, currentWalletAddress, store]);

  // Подключение кошелька
  const handleConnectWallet = async (walletType: 'metamask' | 'trustwallet' | 'aliterra') => {
    console.log('handleConnectWallet called:', walletType);
    
    if (isConnectingWallet) {
      console.log('Already connecting, return');
      return;
    }
    
    // AliTerra - открываем модалку
    if (walletType === 'aliterra') {
      setShowWalletModal(false);
      setShowAliTerraModal(true);
      return;
    }
    
    console.log('Setting screen to connecting');
    setWalletScreen('connecting');
    setIsConnectingWallet(true);
    
    try {
      console.log('Calling connect...');
      await connect(walletType);
      console.log('Connect success!');
      setWalletScreen('success');
      setTimeout(() => { 
        setShowWalletModal(false); 
        setWalletScreen('picker'); 
      }, 1500);
    } catch (err: any) {
      console.error('Connect error:', err);
      setWalletScreen('picker');
    } finally {
      setIsConnectingWallet(false);
    }
  };

  // AliTerra подключение
  const handleAliTerraConnect = () => {
    if (!aliterraAddress.trim() || !aliterraAddress.startsWith('0x')) {
      alert('Введите корректный адрес (0x...)');
      return;
    }
    store.setWallet({
      isConnected: true, address: aliterraAddress, chainId: 137,
      signer: null, provider: null, walletType: 'aliterra', isReadOnly: true,
    });
    store.setCurrentUser({
      id: aliterraAddress,
      name: `AliTerra ${aliterraAddress.slice(0, 6)}`,
      avatar: getAvatarUrl(aliterraAddress),
    });
    setShowAliTerraModal(false);
    setAliterraAddress('');
  };

  // Новый чат
  const handleNewChat = () => {
    if (!newChatAddress.trim()) return;
    const newChat: Chat = {
      id: `chat_${Date.now()}`,
      contactAddress: newChatAddress,
      contactName: truncateAddress(newChatAddress),
      contactAvatar: getAvatarUrl(newChatAddress),
      messages: [], unreadCount: 0,
      lastMessage: 'Новый чат',
      lastMessageTime: Date.now(),
      isOnline: false,
    };
    store.addChat(newChat);
    setNewChatAddress('');
    setShowNewChatModal(false);
    setSelectedChatId(newChat.id);
  };

  // Удаление чата
  const handleDeleteChat = (chatId: string) => {
    store.deleteChat(chatId);
    if (selectedChatId === chatId) setSelectedChatId(null);
    setShowChatMenu(null);
  };

  // Сохранение профиля
  const handleSaveProfile = async () => {
    const avatar = `/ava/${selectedAvatar}.png`;
    store.setCurrentUser({
      id: store.currentUser?.id || currentWalletAddress,
      name: userName || 'Web3 User',
      avatar,
    });

    if (store.wallet.signer && userName) {
      setIsSavingProfile(true);
      try {
        const hasIdentity = await identityService.hasIdentity(currentWalletAddress);
        if (!hasIdentity) {
          await identityService.createIdentity(store.wallet.signer, userName);
        } else {
          await identityService.updateNickname(store.wallet.signer, userName);
        }
      } catch (error) {
        console.error('Error saving identity:', error);
      } finally {
        setIsSavingProfile(false);
      }
    }
    setShowEditProfileModal(false);
  };

  // Копирование адреса
  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(currentWalletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Отключение
  const handleDisconnect = () => {
    disconnect();
    setShowProfileModal(false);
  };

  // Открыть перевод
  const handleOpenTransfer = (recipient?: string) => {
    setTransferRecipient(recipient || selectedChat?.contactAddress || '');
    setTransferAmount('');
    setTransferError(null);
    setTransferSuccess(null);
    setShowTransferModal(true);
  };

  // Отправить перевод
  const handleSendTransfer = async () => {
    if (!store.wallet.signer) { setTransferError('Кошелёк не подключён'); return; }
    if (!transferAmount || parseFloat(transferAmount) <= 0) { setTransferError('Введите сумму'); return; }
    if (!transferService.isValidAddress(transferRecipient)) { setTransferError('Неверный адрес'); return; }
    if (parseFloat(transferAmount) > parseFloat(maticBalance)) { setTransferError('Недостаточно MATIC'); return; }

    setIsSendingTransfer(true);
    setTransferError(null);

    try {
      const result = await transferService.sendMatic(store.wallet.signer, transferRecipient, transferAmount);
      setTransferSuccess(`Отправлено ${transferAmount} MATIC!`);

      if (selectedChatId) {
        const msg: Message = {
          id: `transfer_${Date.now()}`,
          chatId: selectedChatId,
          senderAddress: currentWalletAddress,
          receiverAddress: transferRecipient,
          content: `💸 Переведено ${transferAmount} MATIC\n🔗 ${transferService.getExplorerLink(result.txHash)}`,
          timestamp: Date.now(),
          isSent: true, isDelivered: true,
        };
        store.addMessage(selectedChatId, msg);
      }

      setTimeout(() => { setShowTransferModal(false); setTransferSuccess(null); }, 2000);
    } catch (error: any) {
      setTransferError(error.message || 'Ошибка перевода');
    } finally {
      setIsSendingTransfer(false);
    }
  };

  const filteredChats = useMemo(() => 
    store.chats.filter(c => 
      c.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactAddress.toLowerCase().includes(searchQuery.toLowerCase())
    ), [store.chats, searchQuery]);

  const totalUnread = useMemo(() => 
    store.chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0), [store.chats]);

  return (
    <div className="h-screen w-screen flex bg-[#0d1117] overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {(showSidebar || window.innerWidth >= 768) && (
          <motion.aside
            initial={{ x: -380 }} animate={{ x: 0 }} exit={{ x: -380 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full md:w-[380px] lg:w-[420px] bg-[#161b22] flex flex-col border-r border-[#30363d] absolute md:relative z-20 h-full"
          >
            <header className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img src="/ava/aliterra.png" alt="Web3Gram" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#f0f6fc]">Web3Gram</h1>
                  {totalUnread > 0 && <span className="text-xs text-[#8b949e]">{totalUnread} непрочитанных</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {store.wallet.isConnected && (
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setShowNewChatModal(true)}
                    className="p-2.5 hover:bg-[#21262d] rounded-full transition-colors">
                    <Edit size={20} className="text-[#8b949e]" />
                  </motion.button>
                )}
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => store.wallet.isConnected ? setShowProfileModal(true) : setShowWalletModal(true)}
                  className="p-2.5 hover:bg-[#21262d] rounded-full transition-colors relative">
                  {store.wallet.isConnected ? (
                    <>
                      <img src={store.currentUser?.avatar || getAvatarUrl(currentWalletAddress)} alt="" className="w-6 h-6 rounded-full" />
                      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-[#3fb950] rounded-full border-2 border-[#161b22]" />
                    </>
                  ) : <Wallet size={20} className="text-[#8b949e]" />}
                </motion.button>
              </div>
            </header>

            <div className="px-3 py-2">
              <div className="flex items-center bg-[#21262d] rounded-xl px-3 py-2.5">
                <Search size={18} className="text-[#8b949e] mr-2 flex-shrink-0" />
                <input type="text" placeholder="Поиск чатов..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-[#f0f6fc] placeholder-[#8b949e] text-sm focus:outline-none" />
              </div>
            </div>

            {store.wallet.isConnected && (
              <div className="px-4 py-2 flex items-center gap-2 text-xs">
                <Shield size={14} className={
                  xmtpStatus === 'connected' ? 'text-[#3fb950]' : 
                  xmtpStatus === 'connecting' ? 'text-[#f59e0b]' : 
                  xmtpStatus === 'error' ? 'text-[#ef4444]' : 
                  'text-[#8b949e]'
                } />
                <span className={
                  xmtpStatus === 'connected' ? 'text-[#3fb950]' : 
                  xmtpStatus === 'connecting' ? 'text-[#f59e0b]' : 
                  xmtpStatus === 'error' ? 'text-[#ef4444]' : 
                  'text-[#8b949e]'
                }>
                  {xmtpStatus === 'connected' ? 'E2E активно' : 
                   xmtpStatus === 'connecting' ? 'XMTP подключение...' : 
                   xmtpStatus === 'error' ? 'XMTP ошибка' : 
                   'Подключён'}
                </span>
                <span className="text-[#8b949e]">• {maticBalance} MATIC</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {filteredChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#21262d] flex items-center justify-center mb-4">
                    <MessageCircle size={32} className="text-[#484f58]" />
                  </div>
                  <p className="text-[#8b949e] font-medium">Нет чатов</p>
                </div>
              ) : filteredChats.map((chat) => (
                <div key={chat.id} className="relative">
                  <motion.button
                    onClick={() => {
                      setSelectedChatId(chat.id);
                      store.markAsRead(chat.id);
                      if (window.innerWidth < 768) setShowSidebar(false);
                    }}
                    onContextMenu={(e) => { e.preventDefault(); setShowChatMenu(showChatMenu === chat.id ? null : chat.id); }}
                    whileHover={{ backgroundColor: 'rgba(48, 54, 61, 0.5)' }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${selectedChatId === chat.id ? 'bg-[#1c2128]' : ''}`}>
                    <div className="relative flex-shrink-0">
                      <img src={chat.contactAvatar} alt={chat.contactName} className="w-[52px] h-[52px] rounded-full" />
                      {chat.isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#3fb950] rounded-full border-2 border-[#161b22]" />}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#f0f6fc] truncate">{chat.contactName}</span>
                        <span className="text-xs text-[#8b949e] flex-shrink-0 ml-2">{formatTime(chat.lastMessageTime || Date.now())}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-[#8b949e] truncate pr-2">{chat.lastMessage}</p>
                        {chat.unreadCount > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-[#2f8af5] text-white text-xs rounded-full">{chat.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                  <AnimatePresence>
                    {showChatMenu === chat.id && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }}
                          className="p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors">
                          <Trash2 size={16} className="text-white" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowChatMenu(null); }}
                          className="p-2 bg-[#30363d] hover:bg-[#484f58] rounded-lg transition-colors">
                          <X size={16} className="text-[#8b949e]" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {!store.wallet.isConnected && (
              <div className="p-4 border-t border-[#30363d]">
                <button onClick={() => setShowWalletModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#2f8af5] to-[#6366f1] text-white rounded-xl font-medium">
                  <Wallet size={20} />Подключить кошелёк
                </button>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Area */}
      <main className="flex-1 flex flex-col bg-[#0d1117]">
        {selectedChatId && selectedChat ? (
          <>
            <header className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
              <div className="flex items-center gap-3">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSidebar(true)}
                  className="p-2 hover:bg-[#21262d] rounded-full transition-colors md:hidden">
                  <ArrowLeft size={20} className="text-[#8b949e]" />
                </motion.button>
                <img src={selectedChat.contactAvatar} alt={selectedChat.contactName} className="w-10 h-10 rounded-full" />
                <div>
                  <h2 className="font-semibold text-[#f0f6fc]">{selectedChat.contactName}</h2>
                  <p className="text-xs text-[#8b949e]">{selectedChat.isOnline ? 'в сети' : 'офлайн'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {store.wallet.isConnected && (
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => handleOpenTransfer()}
                    className="p-2.5 hover:bg-[#21262d] rounded-full transition-colors">
                    <DollarSign size={20} className="text-[#3fb950]" />
                  </motion.button>
                )}
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="p-2.5 hover:bg-[#21262d] rounded-full transition-colors">
                  <MoreVertical size={20} className="text-[#8b949e]" />
                </motion.button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
              {currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Lock size={28} className="text-[#484f58] mb-4" />
                  <p className="text-[#8b949e]">Нет сообщений</p>
                </div>
              ) : currentMessages.map((message, index) => {
                const isMe = message.senderAddress === currentWalletAddress;
                const showAvatar = !isMe && (index === 0 || currentMessages[index - 1]?.senderAddress !== message.senderAddress);
                return (
                  <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                    <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : ''}`}>
                      {!isMe && showAvatar && <img src={selectedChat.contactAvatar} alt="" className="w-8 h-8 rounded-full" />}
                      {!isMe && !showAvatar && <div className="w-8" />}
                      <div className={`px-4 py-2.5 ${isMe ? 'bg-gradient-to-br from-[#2b5278] to-[#1e3a5f] rounded-[18px] rounded-br-[6px]' : 'bg-[#182533] rounded-[18px] rounded-bl-[6px]'}`}>
                        <p className="text-[#f0f6fc] text-[15px] whitespace-pre-wrap break-words">{message.content}</p>
                        <div className="flex items-center justify-end gap-1.5 mt-1.5">
                          <span className="text-[11px] text-[#8b949e]/70">
                            {new Date(message.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (message.isRead ? <CheckCheck size={14} className="text-[#2f8af5]" /> : 
                            message.isDelivered ? <CheckCheck size={14} className="text-[#8b949e]" /> : 
                            <Check size={14} className="text-[#8b949e]" />)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3 bg-[#161b22] border-t border-[#30363d]">
              <div className="flex items-end gap-2">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2.5 hover:bg-[#21262d] rounded-full">
                  <Smile size={22} className="text-[#8b949e]" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2.5 hover:bg-[#21262d] rounded-full">
                  <Paperclip size={22} className="text-[#8b949e]" />
                </motion.button>
                <div className="flex-1 bg-[#21262d] rounded-2xl px-4 py-2.5 min-h-[48px] flex items-center">
                  <textarea value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                    placeholder="Написать сообщение..." rows={1}
                    className="flex-1 bg-transparent text-[#f0f6fc] placeholder-[#8b949e] text-[15px] resize-none focus:outline-none max-h-32" />
                </div>
                {messageInput.trim() ? (
                  <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={handleSendMessage}
                    className="p-2.5 bg-[#2f8af5] hover:bg-[#1a73e8] rounded-full shadow-lg shadow-blue-500/30">
                    <Send size={22} className="text-white" />
                  </motion.button>
                ) : (
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2.5 hover:bg-[#21262d] rounded-full">
                    <Mic size={22} className="text-[#8b949e]" />
                  </motion.button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
              <div className="w-28 h-28 mx-auto mb-8 rounded-full overflow-hidden">
                <img src="/ava/aliterra.png" alt="Web3Gram" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-3xl font-bold text-[#f0f6fc] mb-3">Web3Gram</h2>
              <p className="text-[#8b949e] mb-8 text-lg">Безопасный мессенджер на Polygon</p>
              
              {!store.wallet.isConnected ? (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setShowWalletModal(true)}
                  className="flex items-center gap-3 mx-auto px-8 py-4 bg-gradient-to-r from-[#2f8af5] to-[#6366f1] text-white rounded-2xl font-semibold shadow-lg">
                  <Wallet size={24} />Подключить кошелёк
                </motion.button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-[#3fb950]">
                    <Shield size={18} /><span className="font-medium">Кошелёк подключён</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <code className="bg-[#21262d] px-3 py-1.5 rounded-lg text-[#8b949e]">{truncateAddress(currentWalletAddress)}</code>
                    <button onClick={handleCopyAddress} className="p-1.5 hover:bg-[#21262d] rounded-lg">
                      {copied ? <CheckCircle size={16} className="text-[#3fb950]" /> : <Copy size={16} className="text-[#8b949e]" />}
                    </button>
                  </div>
                  <p className="text-[#8b949e]">Баланс: {maticBalance} MATIC</p>
                  <button onClick={() => setShowNewChatModal(true)}
                    className="flex items-center gap-2 mx-auto px-6 py-3 bg-[#21262d] hover:bg-[#282c34] text-[#f0f6fc] rounded-xl">
                    <Plus size={20} />Новый чат
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </main>

      {/* Wallet Modal */}
      <AnimatePresence>
        {showWalletModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowWalletModal(false); setWalletScreen('picker'); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#161b22] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#30363d]">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-[#f0f6fc]">
                    {walletScreen === 'success' ? 'Подключено!' : walletScreen === 'deeplink' ? 'Откройте кошелёк' : 'Подключить кошелёк'}
                  </h3>
                  <button onClick={() => { setShowWalletModal(false); setWalletScreen('picker'); }} className="p-1.5 hover:bg-[#21262d] rounded-full">
                    <X size={20} className="text-[#8b949e]" />
                  </button>
                </div>

                {walletScreen === 'picker' && (
                  <div className="space-y-3">
                    {/* ТЕСТОВАЯ КНОПКА - если работает, значит проблема в handleConnectWallet */}
                    <button 
                      onClick={() => {
                        console.log('TEST BUTTON CLICKED');
                        alert('Кнопка работает!');
                      }}
                      style={{ 
                        width: '100%', 
                        padding: '16px', 
                        backgroundColor: '#ff0000',
                        color: 'white',
                        borderRadius: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}
                    >
                      ТЕСТ - НАЖМИ МЕНЯ
                    </button>

                    {/* MetaMask - ПРЯМОЙ ВЫЗОВ */}
                    <button 
                      onClick={async () => {
                        console.log('=== METAMASK BUTTON CLICKED ===');
                        try {
                          await connect('metamask');
                          console.log('=== CONNECT SUCCESS ===');
                          setShowWalletModal(false);
                        } catch (err) {
                          console.error('=== CONNECT ERROR ===', err);
                          alert('Ошибка: ' + (err as any).message);
                        }
                      }}
                      style={{ 
                        width: '100%', 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px', 
                        backgroundColor: '#21262d',
                        borderRadius: '12px',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <MetaMaskIcon className="w-10 h-10 rounded-xl" />
                      <div style={{ textAlign: 'left', flex: 1 }}>
                        <p style={{ color: '#f0f6fc', fontWeight: 500, margin: 0 }}>MetaMask</p>
                        <p style={{ color: '#8b949e', fontSize: '12px', margin: 0 }}>Нажми для подключения</p>
                      </div>
                    </button>

                    {/* Trust Wallet - ПРЯМОЙ ВЫЗОВ */}
                    <button 
                      onClick={async () => {
                        console.log('=== TRUST WALLET BUTTON CLICKED ===');
                        try {
                          await connect('trustwallet');
                          console.log('=== CONNECT SUCCESS ===');
                          setShowWalletModal(false);
                        } catch (err) {
                          console.error('=== CONNECT ERROR ===', err);
                          alert('Ошибка: ' + (err as any).message);
                        }
                      }}
                      style={{ 
                        width: '100%', 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px', 
                        backgroundColor: '#21262d',
                        borderRadius: '12px',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <TrustWalletIcon className="w-10 h-10 rounded-xl" />
                      <div style={{ textAlign: 'left', flex: 1 }}>
                        <p style={{ color: '#f0f6fc', fontWeight: 500, margin: 0 }}>Trust Wallet</p>
                        <p style={{ color: '#8b949e', fontSize: '12px', margin: 0 }}>Нажми для подключения</p>
                      </div>
                    </button>

                    <button onClick={() => handleConnectWallet('aliterra')}
                      className="w-full flex items-center gap-4 p-4 bg-[#21262d] hover:bg-[#282c34] rounded-xl transition-colors">
                      <AliTerraIcon className="w-10 h-10 rounded-xl" />
                      <div className="text-left flex-1">
                        <p className="font-medium text-[#f0f6fc]">AliTerra Wallet</p>
                        <p className="text-xs text-[#8b949e]">Ручной ввод адреса</p>
                      </div>
                    </button>
                  </div>
                )}

                {walletScreen === 'connecting' && (
                  <div className="py-8 text-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-16 h-16 mx-auto mb-6">
                      <Loader2 size={64} className="text-[#2f8af5]" />
                    </motion.div>
                    <p className="text-[#f0f6fc] text-lg font-medium mb-2">Подключение...</p>
                    <p className="text-sm text-[#8b949e] mb-4">Подтвердите в кошельке</p>
                    <button onClick={() => { setShowWalletModal(false); setWalletScreen('picker'); }}
                      className="text-[#8b949e] text-sm hover:text-[#f0f6fc] underline">Отмена</button>
                  </div>
                )}

                {walletScreen === 'success' && (
                  <div className="py-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-[#3fb950] rounded-full flex items-center justify-center">
                      <Check size={40} className="text-white" />
                    </div>
                    <p className="text-[#f0f6fc] text-xl font-semibold">Успешно!</p>
                    <p className="text-sm text-[#8b949e] mt-2">{truncateAddress(currentWalletAddress)}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AliTerra Modal */}
      <AnimatePresence>
        {showAliTerraModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAliTerraModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#161b22] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#30363d] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-[#f0f6fc]">AliTerra Wallet</h3>
                <button onClick={() => setShowAliTerraModal(false)} className="p-1.5 hover:bg-[#21262d] rounded-full">
                  <X size={20} className="text-[#8b949e]" />
                </button>
              </div>
              <div className="space-y-4">
                <a href="https://wallet.aliterra.space" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-[#ff6b6b] to-[#feca57] text-white rounded-lg font-medium">
                  <Globe size={18} />Открыть wallet.aliterra.space<ExternalLink size={14} />
                </a>
                <input type="text" placeholder="Вставьте адрес (0x...)" value={aliterraAddress}
                  onChange={(e) => setAliterraAddress(e.target.value)}
                  className="w-full bg-[#21262d] text-[#f0f6fc] placeholder-[#484f58] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f8af5]" />
                <button onClick={handleAliTerraConnect}
                  className="w-full py-3.5 bg-gradient-to-r from-[#ff6b6b] to-[#feca57] text-white rounded-xl font-medium">
                  Подключить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTransferModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#161b22] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#30363d] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-[#f0f6fc]">Перевести MATIC</h3>
                <button onClick={() => setShowTransferModal(false)} className="p-1.5 hover:bg-[#21262d] rounded-full">
                  <X size={20} className="text-[#8b949e]" />
                </button>
              </div>
              
              {transferError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {transferError}
                </div>
              )}
              
              {transferSuccess && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
                  {transferSuccess}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#8b949e] mb-2">Получатель</label>
                  <input type="text" value={transferRecipient}
                    onChange={(e) => setTransferRecipient(e.target.value)}
                    className="w-full bg-[#21262d] text-[#f0f6fc] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f8af5]" />
                </div>
                <div>
                  <label className="block text-sm text-[#8b949e] mb-2">Сумма (MATIC)</label>
                  <input type="number" placeholder="0.0" value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full bg-[#21262d] text-[#f0f6fc] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f8af5]" />
                  <p className="text-xs text-[#8b949e] mt-1">Баланс: {maticBalance} MATIC</p>
                </div>
                <button onClick={handleSendTransfer} disabled={isSendingTransfer}
                  className="w-full py-3.5 bg-gradient-to-r from-[#3fb950] to-[#2ea043] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSendingTransfer ? <><Loader2 size={18} className="animate-spin" />Отправка...</> : <><DollarSign size={18} />Отправить</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChatModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNewChatModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#161b22] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#30363d] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-[#f0f6fc]">Новый чат</h3>
                <button onClick={() => setShowNewChatModal(false)} className="p-1.5 hover:bg-[#21262d] rounded-full">
                  <X size={20} className="text-[#8b949e]" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#8b949e] mb-2">Ethereum адрес</label>
                  <input type="text" placeholder="0x..." value={newChatAddress}
                    onChange={(e) => setNewChatAddress(e.target.value)}
                    className="w-full bg-[#21262d] text-[#f0f6fc] placeholder-[#484f58] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f8af5]" />
                </div>
                <button onClick={handleNewChat}
                  className="w-full py-3.5 bg-gradient-to-r from-[#2f8af5] to-[#6366f1] text-white rounded-xl font-medium">
                  Начать чат
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowProfileModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#161b22] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#30363d] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-[#f0f6fc]">Профиль</h3>
                <button onClick={() => setShowProfileModal(false)} className="p-1.5 hover:bg-[#21262d] rounded-full">
                  <X size={20} className="text-[#8b949e]" />
                </button>
              </div>
              <div className="text-center mb-6">
                <img src={store.currentUser?.avatar || getAvatarUrl(currentWalletAddress)} alt="" className="w-24 h-24 rounded-full mx-auto mb-2 border-4 border-[#2f8af5]" />
                <h4 className="text-lg font-semibold text-[#f0f6fc]">{store.currentUser?.name || 'Web3 User'}</h4>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <code className="bg-[#21262d] px-3 py-1.5 rounded-lg text-sm text-[#8b949e]">{truncateAddress(currentWalletAddress)}</code>
                  <button onClick={handleCopyAddress} className="p-1.5 hover:bg-[#21262d] rounded-lg">
                    {copied ? <CheckCircle size={16} className="text-[#3fb950]" /> : <Copy size={16} className="text-[#8b949e]" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-[#21262d] rounded-xl">
                  <span className="text-sm text-[#8b949e]">Сеть</span>
                  <span className="text-sm text-[#f0f6fc]">Polygon Mainnet</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#21262d] rounded-xl">
                  <span className="text-sm text-[#8b949e]">Баланс</span>
                  <span className="text-sm text-[#f0f6fc]">{maticBalance} MATIC</span>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <button onClick={() => { setShowProfileModal(false); setShowEditProfileModal(true); }}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-[#21262d] hover:bg-[#282c34] text-[#f0f6fc] rounded-xl">
                  <Settings size={20} /><span>Редактировать профиль</span>
                </button>
                <button onClick={handleDisconnect}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl">
                  <LogOut size={20} /><span>Отключить кошелёк</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditProfileModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEditProfileModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#161b22] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#30363d] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-[#f0f6fc]">Редактировать профиль</h3>
                <button onClick={() => setShowEditProfileModal(false)} className="p-1.5 hover:bg-[#21262d] rounded-full">
                  <X size={20} className="text-[#8b949e]" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#8b949e] mb-3">Выберите аватар</label>
                  <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto p-1">
                    {avatarOptions.map((avatar) => (
                      <button key={avatar} onClick={() => setSelectedAvatar(avatar)}
                        className={`p-1 rounded-lg transition-all ${selectedAvatar === avatar ? 'ring-2 ring-[#2f8af5] bg-[#21262d]' : 'hover:bg-[#21262d]'}`}>
                        <img src={`/ava/${avatar}.png`} alt={avatar} className="w-10 h-10 rounded-full" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[#8b949e] mb-2">Имя пользователя</label>
                  <input type="text" placeholder="Введите имя" value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-[#21262d] text-[#f0f6fc] placeholder-[#484f58] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f8af5]" />
                </div>
                <div className="p-4 bg-[#21262d] rounded-xl">
                  <p className="text-xs text-[#8b949e] mb-2">Предпросмотр:</p>
                  <div className="flex items-center gap-3">
                    <img src={`/ava/${selectedAvatar}.png`} alt="" className="w-12 h-12 rounded-full" />
                    <div>
                      <p className="font-medium text-[#f0f6fc]">{userName || 'Web3 User'}</p>
                      <p className="text-xs text-[#8b949e]">{truncateAddress(currentWalletAddress)}</p>
                    </div>
                  </div>
                </div>
                <button onClick={handleSaveProfile} disabled={isSavingProfile}
                  className="w-full py-3.5 bg-gradient-to-r from-[#2f8af5] to-[#6366f1] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSavingProfile ? <><Loader2 size={18} className="animate-spin" />Сохранение...</> : 'Сохранить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
