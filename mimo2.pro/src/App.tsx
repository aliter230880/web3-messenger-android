import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import { 
  Search, 
  Edit, 
  Phone, 
  Video, 
  MoreVertical, 
  Send, 
  Smile, 
  Paperclip, 
  Mic, 
  Check, 
  CheckCheck,
  ArrowLeft,
  LogOut,
  Wallet,
  Shield,
  Globe,
  Lock,
  MessageCircle,
  Plus,
  X,
  Loader2,
  Copy,
  CheckCircle,
  ExternalLink,
  Trash2,
  Settings,
  User
} from 'lucide-react';
import { useStore, Chat, Message } from './store';
import { useWallet } from './hooks/useWallet';
import { profileService } from './services/profileService';

// Локальные аватарки
const avatarOptions = [
  'ava (1)', 'ava (2)', 'ava (3)', 'ava (4)', 'ava (5)', 'ava (6)', 'ava (7)', 'ava (8)',
  'ava (9)', 'ava (10)', 'ava (11)', 'ava (12)', 'ava (13)', 'ava (14)', 'ava (15)', 'ava (16)',
  'ava (17)', 'ava (18)', 'ava (19)', 'ava (20)', 'ava (21)', 'ava (22)'
];

const getAvatarUrl = (seed: string) => {
  const index = Math.abs(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % avatarOptions.length;
  return `/ava/${avatarOptions[index]}.png`;
};

// Иконки кошельков
const MetaMaskIcon = ({ className = "w-10 h-10" }) => (
  <img src="/ava/metamask.png" alt="MetaMask" className={className} />
);

const TrustWalletIcon = ({ className = "w-10 h-10" }) => (
  <img src="/ava/trust.png" alt="Trust Wallet" className={className} />
);

const AliTerraIcon = ({ className = "w-10 h-10" }) => (
  <img src="/ava/aliterra.png" alt="AliTerra" className={className} />
);

// Утилиты
const formatTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'сейчас';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин`;
  if (diff < 86400000) return new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return new Date(timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

const truncateAddress = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

export default function App() {
  const store = useStore();
  const { connect, disconnect, wcUri, error: walletError } = useWallet();
  
  const [selectedChatId, setSelectedChatId] = useState<string | null>(store.activeChat);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showAliTerraModal, setShowAliTerraModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [walletScreen, setWalletScreen] = useState<'picker' | 'connecting' | 'deeplink' | 'success'>('picker');
  const [copied, setCopied] = useState(false);
  const [newChatAddress, setNewChatAddress] = useState('');
  const [aliterraAddress, setAliterraAddress] = useState('');
  const [showChatMenu, setShowChatMenu] = useState<string | null>(null);
  const [userName, setUserName] = useState(store.currentUser?.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState('ava (1)');
  const [xmtpStatus, setXmtpStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const xmtpInitRef = useRef(false);
  
  const currentWalletAddress = store.wallet.address || '';
  const selectedChat = store.chats.find(c => c.id === selectedChatId);
  const currentMessages = selectedChatId ? (store.chats.find(c => c.id === selectedChatId)?.messages || []) : [];

  // Автоскролл
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  // Инициализация профиля
  useEffect(() => {
    if (store.currentUser) {
      setUserName(store.currentUser.name || '');
    }
  }, [store.currentUser?.name]);

  // Авто-подключение при запуске если был подключён ранее
  useEffect(() => {
    const autoConnect = async () => {
      // Проверяем localStorage напрямую
      try {
        const saved = localStorage.getItem('web3gram-storage');
        if (saved) {
          const data = JSON.parse(saved);
          const savedAddress = data?.state?.savedWalletAddress;
          const savedType = data?.state?.savedWalletType;
          
          if (savedAddress && !store.wallet.isConnected) {
            console.log('Auto-connect: found saved wallet', savedAddress);
            
            // Проверяем есть ли window.ethereum
            const ethereum = (window as any).ethereum;
            if (ethereum && savedType !== 'aliterra') {
              try {
                // Пытаемся получить аккаунты без запроса
                const accounts = await ethereum.request({ method: 'eth_accounts' });
                
                if (accounts && accounts.length > 0 && accounts[0].toLowerCase() === savedAddress.toLowerCase()) {
                  // Кошелёк всё ещё подключён
                  console.log('Auto-connect: wallet still connected');
                  
                  const provider = new ethers.providers.Web3Provider(ethereum, 'any');
                  const signer = provider.getSigner();
                  
                  store.setWallet({
                    isConnected: true,
                    address: accounts[0],
                    chainId: 137,
                    signer: signer,
                    provider: provider,
                    walletType: savedType || 'metamask',
                    isReadOnly: false,
                  });
                }
              } catch (error) {
                console.log('Auto-connect: wallet not available');
              }
            }
          }
        }
      } catch (error) {
        console.error('Auto-connect error:', error);
      }
    };

    // Запускаем авто-подключение с небольшой задержкой
    const timeout = setTimeout(autoConnect, 500);
    return () => clearTimeout(timeout);
  }, []);

  // XMTP инициализация с жёстким timeout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const initXmtp = async () => {
      if (!store.wallet.isConnected || !store.wallet.signer || xmtpInitRef.current) return;
      
      xmtpInitRef.current = true;
      setXmtpStatus('connecting');

      // Жёсткий timeout 8 секунд
      timeoutId = setTimeout(() => {
        if (isMounted && xmtpStatus === 'connecting') {
          console.log('XMTP: Timeout - отключаем');
          setXmtpStatus('failed');
          xmtpInitRef.current = false;
        }
      }, 8000);

      try {
        const { xmtpService } = await import('./services/xmtpService');
        const success = await xmtpService.initialize(store.wallet.signer);
        
        clearTimeout(timeoutId);
        
        if (success && isMounted) {
          setXmtpStatus('connected');
          console.log('XMTP: Connected');
        } else if (isMounted) {
          setXmtpStatus('failed');
          xmtpInitRef.current = false;
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('XMTP init error:', error);
        if (isMounted) {
          setXmtpStatus('failed');
          xmtpInitRef.current = false;
        }
      }
    };

    if (store.wallet.isConnected && store.wallet.signer) {
      initXmtp();
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [store.wallet.isConnected, store.wallet.signer]);

  // Обработка ошибок кошелька
  useEffect(() => {
    if (walletError && walletScreen === 'connecting') {
      setWalletScreen('deeplink');
    }
  }, [walletError, walletScreen]);

  // Загрузка профиля on-chain при подключении кошелька
  useEffect(() => {
    const loadOnChainProfile = async () => {
      if (store.wallet.isConnected && store.wallet.address) {
        try {
          console.log('Loading on-chain profile for:', store.wallet.address);
          
          // Проверяем есть ли профиль on-chain
          const profile = await profileService.getProfile(store.wallet.address);
          
          if (profile && profile.exists && profile.username) {
            console.log('Found on-chain profile:', profile.username);
            
            // Обновляем локальный профиль
            store.setCurrentUser({
              id: store.wallet.address,
              name: profile.username,
              avatar: getAvatarUrl(store.wallet.address),
            });
            
            setUserName(profile.username);
          } else if (!store.currentUser) {
            // Нет профиля - устанавливаем дефолтный
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

    loadOnChainProfile();
  }, [store.wallet.isConnected, store.wallet.address]);

  // Сохранение выбранного чата
  useEffect(() => {
    if (selectedChatId) {
      store.setActiveChat(selectedChatId);
    }
  }, [selectedChatId]);

  // Обработчик отправки сообщения
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedChatId) return;
    const targetChat = store.chats.find(c => c.id === selectedChatId);
    if (!targetChat) return;

    const content = messageInput.trim();
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      chatId: selectedChatId,
      senderAddress: currentWalletAddress,
      receiverAddress: targetChat.contactAddress,
      content,
      timestamp: Date.now(),
      isSent: true,
      isDelivered: xmtpStatus === 'connected',
      isRead: false,
    };

    // Добавляем через store (сохраняется в localStorage)
    store.addMessage(selectedChatId, newMessage);
    setMessageInput('');

    // Попытка отправки через XMTP
    if (xmtpStatus === 'connected') {
      try {
        const { xmtpService } = await import('./services/xmtpService');
        await xmtpService.sendMessage(targetChat.contactAddress, content);
      } catch (error) {
        console.error('XMTP send error:', error);
      }
    }
  }, [messageInput, selectedChatId, currentWalletAddress, xmtpStatus, store]);

  // Подключение кошелька
  const handleConnectWallet = async (walletType: 'metamask' | 'trustwallet' | 'aliterra') => {
    if (isConnectingWallet) return;
    
    setWalletScreen('connecting');
    setIsConnectingWallet(true);
    
    if (walletType === 'aliterra') {
      setShowWalletModal(false);
      setShowAliTerraModal(true);
      setWalletScreen('picker');
      setIsConnectingWallet(false);
      return;
    }
    
    try {
      await connect(walletType);
      setWalletScreen('success');
      setTimeout(() => {
        setShowWalletModal(false);
        setWalletScreen('picker');
      }, 1500);
    } catch (err: any) {
      if (err.message.includes('Подтвердите')) {
        setWalletScreen('deeplink');
      } else {
        setWalletScreen('picker');
      }
    } finally {
      setIsConnectingWallet(false);
    }
  };

  // Подключение AliTerra
  const handleAliTerraConnect = () => {
    if (!aliterraAddress.trim() || !aliterraAddress.startsWith('0x')) {
      alert('Введите корректный Ethereum адрес (0x...)');
      return;
    }

    store.setWallet({
      isConnected: true,
      address: aliterraAddress,
      chainId: 137,
      signer: null,
      provider: null,
      walletType: 'aliterra',
      isReadOnly: true,
    });

    store.setCurrentUser({
      id: aliterraAddress,
      name: `AliTerra ${aliterraAddress.slice(0, 6)}`,
      avatar: getAvatarUrl(aliterraAddress),
    });

    setShowAliTerraModal(false);
    setAliterraAddress('');
  };

  // Создание нового чата
  const handleNewChat = () => {
    if (!newChatAddress.trim()) return;
    
    const newChat: Chat = {
      id: `chat_${Date.now()}`,
      contactAddress: newChatAddress,
      contactName: truncateAddress(newChatAddress),
      contactAvatar: getAvatarUrl(newChatAddress),
      messages: [],
      unreadCount: 0,
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
    store.updateChat(chatId, { messages: [] }); // Очищаем
    // Фильтруем чаты
    const filtered = store.chats.filter(c => c.id !== chatId);
    store.chats.splice(0, store.chats.length, ...filtered);
    
    if (selectedChatId === chatId) {
      setSelectedChatId(null);
    }
    setShowChatMenu(null);
  };

  // Сохранение профиля (локально + on-chain)
  const handleSaveProfile = async () => {
    const avatar = `/ava/${selectedAvatar}.png`;
    
    // Сохраняем локально
    store.setCurrentUser({
      id: store.currentUser?.id || currentWalletAddress,
      name: userName || 'Web3 User',
      avatar,
    });

    // Сохраняем on-chain если есть signer
    if (store.wallet.signer && userName) {
      setIsSavingProfile(true);
      try {
        profileService.initWithSigner(store.wallet.signer);
        const hasProfile = await profileService.hasProfile(currentWalletAddress);
        
        if (!hasProfile) {
          console.log('Creating on-chain profile...');
          await profileService.createProfile(userName, 'wallet');
        } else {
          console.log('Updating on-chain username...');
          await profileService.updateUsername(userName);
        }
      } catch (error) {
        console.error('Error saving profile on-chain:', error);
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
    xmtpInitRef.current = false;
    setXmtpStatus('disconnected');
  };

  // Фильтрация чатов
  const filteredChats = useMemo(() => 
    store.chats.filter(chat => 
      chat.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.contactAddress.toLowerCase().includes(searchQuery.toLowerCase())
    ), [store.chats, searchQuery]);

  // Счётчик непрочитанных
  const totalUnread = useMemo(() => 
    store.chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0), [store.chats]);

  return (
    <div className="h-screen w-screen flex bg-[#0d1117] overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {(showSidebar || window.innerWidth >= 768) && (
          <motion.aside
            initial={{ x: -380 }}
            animate={{ x: 0 }}
            exit={{ x: -380 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full md:w-[380px] lg:w-[420px] bg-[#161b22] flex flex-col border-r border-[#30363d] absolute md:relative z-20 h-full"
          >
            <header className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-[#30363d] safe-top">
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
                      <img src={store.currentUser?.avatar || getAvatarUrl(currentWalletAddress)}
                        alt="Profile" className="w-6 h-6 rounded-full" />
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
                <Shield size={14} className={xmtpStatus === 'connected' ? 'text-[#3fb950]' : xmtpStatus === 'connecting' ? 'text-[#f59e0b]' : xmtpStatus === 'failed' ? 'text-[#ef4444]' : 'text-[#8b949e]'} />
                <span className={xmtpStatus === 'connected' ? 'text-[#3fb950]' : xmtpStatus === 'connecting' ? 'text-[#f59e0b]' : xmtpStatus === 'failed' ? 'text-[#ef4444]' : 'text-[#8b949e]'}>
                  {xmtpStatus === 'connected' ? 'E2E активно' : xmtpStatus === 'connecting' ? 'Подключение...' : xmtpStatus === 'failed' ? 'E2E недоступно' : 'E2E отключено'}
                </span>
                <span className="text-[#8b949e]">• Polygon</span>
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
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setShowChatMenu(showChatMenu === chat.id ? null : chat.id);
                    }}
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
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="ml-2 px-2 py-0.5 bg-[#2f8af5] text-white text-xs rounded-full flex-shrink-0 min-w-[20px] text-center">
                            {chat.unreadCount}
                          </motion.span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                  
                  <AnimatePresence>
                    {showChatMenu === chat.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
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
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#2f8af5] to-[#6366f1] text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
                  <Wallet size={20} />Подключить кошелёк
                </button>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Area */}
      <main className="flex-1 flex flex-col bg-[#0d1117] relative">
        {selectedChatId && selectedChat ? (
          <>
            <header className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-[#30363d] safe-top">
              <div className="flex items-center gap-3">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSidebar(true)}
                  className="p-2 hover:bg-[#21262d] rounded-full transition-colors md:hidden">
                  <ArrowLeft size={20} className="text-[#8b949e]" />
                </motion.button>
                <div className="relative">
                  <img src={selectedChat.contactAvatar} alt={selectedChat.contactName} className="w-10 h-10 rounded-full" />
                  {selectedChat.isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#3fb950] rounded-full border-2 border-[#161b22]" />}
                </div>
                <div>
                  <h2 className="font-semibold text-[#f0f6fc]">{selectedChat.contactName}</h2>
                  <p className="text-xs text-[#8b949e]">
                    {selectedChat.isOnline ? 'в сети' : `был(а) ${formatTime(selectedChat.lastMessageTime || Date.now())}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2.5 hover:bg-[#21262d] rounded-full transition-colors hidden sm:flex">
                  <Phone size={20} className="text-[#8b949e]" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2.5 hover:bg-[#21262d] rounded-full transition-colors hidden sm:flex">
                  <Video size={20} className="text-[#8b949e]" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-2.5 hover:bg-[#21262d] rounded-full transition-colors">
                  <MoreVertical size={20} className="text-[#8b949e]" />
                </motion.button>
              </div>
            </header>

            <div className="flex items-center justify-center gap-2 py-2 px-4 text-xs text-[#8b949e] bg-[#0d1117]">
              <Lock size={12} className="text-[#3fb950]" />
              <span>Сообщения защищены (XMTP)</span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 bg-[#0d1117]">
              {currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-[#161b22] flex items-center justify-center mb-4">
                    <Lock size={28} className="text-[#484f58]" />
                  </div>
                  <p className="text-[#8b949e]">Нет сообщений</p>
                </div>
              ) : currentMessages.map((message, index) => {
                const isMe = message.senderAddress === currentWalletAddress;
                const showAvatar = !isMe && (index === 0 || currentMessages[index - 1]?.senderAddress !== message.senderAddress);
                
                return (
                  <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                    <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : ''}`}>
                      {!isMe && showAvatar && (
                        <img src={selectedChat.contactAvatar} alt="Avatar" className="w-8 h-8 rounded-full flex-shrink-0" />
                      )}
                      {!isMe && !showAvatar && <div className="w-8" />}
                      <div className="flex flex-col">
                        {showAvatar && !isMe && <span className="text-xs text-[#2f8af5] ml-3 mb-1">{selectedChat.contactName}</span>}
                        <div className={`px-4 py-2.5 ${isMe ? 'bg-gradient-to-br from-[#2b5278] to-[#1e3a5f] rounded-[18px] rounded-br-[6px]' : 'bg-[#182533] rounded-[18px] rounded-bl-[6px]'}`}>
                          <p className="text-[#f0f6fc] text-[15px] whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
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
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3 bg-[#161b22] border-t border-[#30363d] safe-bottom">
              <div className="flex items-end gap-2">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2.5 hover:bg-[#21262d] rounded-full transition-colors flex-shrink-0">
                  <Smile size={22} className="text-[#8b949e]" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2.5 hover:bg-[#21262d] rounded-full transition-colors flex-shrink-0">
                  <Paperclip size={22} className="text-[#8b949e]" />
                </motion.button>
                <div className="flex-1 bg-[#21262d] rounded-2xl px-4 py-2.5 min-h-[48px] flex items-center">
                  <textarea value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                    placeholder="Написать сообщение..." rows={1}
                    className="flex-1 bg-transparent text-[#f0f6fc] placeholder-[#8b949e] text-[15px] resize-none focus:outline-none max-h-32" />
                </div>
                {messageInput.trim() ? (
                  <motion.button initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={handleSendMessage}
                    className="p-2.5 bg-[#2f8af5] hover:bg-[#1a73e8] rounded-full transition-colors flex-shrink-0 shadow-lg shadow-blue-500/30">
                    <Send size={22} className="text-white" />
                  </motion.button>
                ) : (
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2.5 hover:bg-[#21262d] rounded-full transition-colors flex-shrink-0">
                    <Mic size={22} className="text-[#8b949e]" />
                  </motion.button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }} className="text-center max-w-md">
              <motion.div animate={{ boxShadow: ['0 0 20px rgba(47,138,245,0.3)', '0 0 40px rgba(47,138,245,0.5)', '0 0 20px rgba(47,138,245,0.3)'] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-28 h-28 mx-auto mb-8 rounded-full overflow-hidden">
                <img src="/ava/aliterra.png" alt="Web3Gram" className="w-full h-full object-cover" />
              </motion.div>
              <h2 className="text-3xl font-bold text-[#f0f6fc] mb-3">Web3Gram</h2>
              <p className="text-[#8b949e] mb-8 text-lg">Безопасный мессенджер на базе Polygon</p>
              
              {!store.wallet.isConnected ? (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setShowWalletModal(true)}
                  className="flex items-center gap-3 mx-auto px-8 py-4 bg-gradient-to-r from-[#2f8af5] to-[#6366f1] text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl transition-shadow">
                  <Wallet size={24} />Подключить кошелёк
                </motion.button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-[#3fb950]">
                    <Shield size={18} /><span className="font-medium">Кошелёк подключён</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <code className="bg-[#21262d] px-3 py-1.5 rounded-lg text-[#8b949e]">{truncateAddress(currentWalletAddress)}</code>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleCopyAddress}
                      className="p-1.5 hover:bg-[#21262d] rounded-lg transition-colors">
                      {copied ? <CheckCircle size={16} className="text-[#3fb950]" /> : <Copy size={16} className="text-[#8b949e]" />}
                    </motion.button>
                  </div>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setShowNewChatModal(true)}
                    className="flex items-center gap-2 mx-auto px-6 py-3 bg-[#21262d] hover:bg-[#282c34] text-[#f0f6fc] rounded-xl font-medium transition-colors">
                    <Plus size={20} />Новый чат
                  </motion.button>
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
                  <button onClick={() => { setShowWalletModal(false); setWalletScreen('picker'); }} className="p-1.5 hover:bg-[#21262d] rounded-full transition-colors">
                    <X size={20} className="text-[#8b949e]" />
                  </button>
                </div>

                {walletScreen === 'picker' && (
                  <div className="space-y-3">
                    <button onClick={() => handleConnectWallet('metamask')}
                      className="w-full flex items-center gap-4 p-4 bg-[#21262d] hover:bg-[#282c34] rounded-xl transition-colors group">
                      <MetaMaskIcon className="w-10 h-10 rounded-xl" />
                      <div className="text-left flex-1">
                        <p className="font-medium text-[#f0f6fc] group-hover:text-white">MetaMask</p>
                        <p className="text-xs text-[#8b949e]">Мобильный / Расширение</p>
                      </div>
                    </button>

                    <button onClick={() => handleConnectWallet('trustwallet')}
                      className="w-full flex items-center gap-4 p-4 bg-[#21262d] hover:bg-[#282c34] rounded-xl transition-colors group">
                      <TrustWalletIcon className="w-10 h-10 rounded-xl" />
                      <div className="text-left flex-1">
                        <p className="font-medium text-[#f0f6fc] group-hover:text-white">Trust Wallet</p>
                        <p className="text-xs text-[#8b949e]">Мобильный кошелёк</p>
                      </div>
                    </button>

                    <button onClick={() => handleConnectWallet('aliterra')}
                      className="w-full flex items-center gap-4 p-4 bg-[#21262d] hover:bg-[#282c34] rounded-xl transition-colors group">
                      <AliTerraIcon className="w-10 h-10 rounded-xl" />
                      <div className="text-left flex-1">
                        <p className="font-medium text-[#f0f6fc] group-hover:text-white">AliTerra Wallet</p>
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
                    <button onClick={() => { setShowWalletModal(false); setWalletScreen('picker'); }} className="text-[#8b949e] text-sm hover:text-[#f0f6fc] underline">Отмена</button>
                  </div>
                )}

                {walletScreen === 'deeplink' && (
                  <div className="py-4 text-center">
                    <p className="text-[#8b949e] text-sm mb-4">Если кошелёк не открылся:</p>
                    <div className="space-y-3">
                      <a href={`metamask://wc?uri=${encodeURIComponent(wcUri || '')}`}
                        className="flex items-center justify-center gap-3 p-4 bg-[#21262d] hover:bg-[#282c34] rounded-xl transition-colors w-full">
                        <MetaMaskIcon className="w-8 h-8 rounded-lg" />
                        <span className="text-[#f0f6fc] font-medium">Открыть в MetaMask</span>
                        <ExternalLink size={16} className="text-[#8b949e]" />
                      </a>
                      <a href={`trust://wc?uri=${encodeURIComponent(wcUri || '')}`}
                        className="flex items-center justify-center gap-3 p-4 bg-[#21262d] hover:bg-[#282c34] rounded-xl transition-colors w-full">
                        <TrustWalletIcon className="w-8 h-8 rounded-lg" />
                        <span className="text-[#f0f6fc] font-medium">Открыть в Trust Wallet</span>
                        <ExternalLink size={16} className="text-[#8b949e]" />
                      </a>
                    </div>
                    <button onClick={() => { setShowWalletModal(false); setWalletScreen('picker'); }}
                      className="mt-4 px-4 py-2 text-[#8b949e] hover:text-[#f0f6fc] transition-colors">Закрыть</button>
                  </div>
                )}

                {walletScreen === 'success' && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }} className="py-8 text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                      className="w-20 h-20 mx-auto mb-6 bg-[#3fb950] rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                      <Check size={40} className="text-white" />
                    </motion.div>
                    <p className="text-[#f0f6fc] text-xl font-semibold">Успешно!</p>
                    <p className="text-sm text-[#8b949e] mt-2">{truncateAddress(currentWalletAddress)}</p>
                  </motion.div>
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
              className="bg-[#161b22] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#30363d]">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-[#f0f6fc]">AliTerra Wallet</h3>
                  <button onClick={() => setShowAliTerraModal(false)} className="p-1.5 hover:bg-[#21262d] rounded-full transition-colors">
                    <X size={20} className="text-[#8b949e]" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-[#21262d] rounded-xl">
                    <p className="text-sm text-[#8b949e] mb-3">1. Откройте AliTerra Wallet:</p>
                    <a href="https://wallet.aliterra.space" target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-[#ff6b6b] to-[#feca57] text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
                      <Globe size={18} />Открыть wallet.aliterra.space<ExternalLink size={14} />
                    </a>
                  </div>
                  
                  <div className="p-4 bg-[#21262d] rounded-xl">
                    <p className="text-sm text-[#8b949e] mb-2">2. Скопируйте адрес и вставьте:</p>
                    <input type="text" placeholder="0x..." value={aliterraAddress}
                      onChange={(e) => setAliterraAddress(e.target.value)}
                      className="w-full bg-[#0d1117] text-[#f0f6fc] placeholder-[#484f58] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f8af5]" />
                  </div>
                  
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleAliTerraConnect}
                    className="w-full py-3.5 bg-gradient-to-r from-[#ff6b6b] to-[#feca57] text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
                    Подключить
                  </motion.button>
                </div>
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
              className="bg-[#161b22] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#30363d]">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-[#f0f6fc]">Новый чат</h3>
                  <button onClick={() => setShowNewChatModal(false)} className="p-1.5 hover:bg-[#21262d] rounded-full transition-colors">
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
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleNewChat}
                    className="w-full py-3.5 bg-gradient-to-r from-[#2f8af5] to-[#6366f1] text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20">
                    Начать чат
                  </motion.button>
                </div>
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
              className="bg-[#161b22] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#30363d]">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-[#f0f6fc]">Профиль</h3>
                  <button onClick={() => setShowProfileModal(false)} className="p-1.5 hover:bg-[#21262d] rounded-full transition-colors">
                    <X size={20} className="text-[#8b949e]" />
                  </button>
                </div>
                <div className="text-center mb-6">
                  <img src={store.currentUser?.avatar || getAvatarUrl(currentWalletAddress)}
                    alt="Avatar" className="w-24 h-24 rounded-full mx-auto mb-2 border-4 border-[#2f8af5]" />
                  <h4 className="text-lg font-semibold text-[#f0f6fc]">{store.currentUser?.name || 'Web3 User'}</h4>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <code className="bg-[#21262d] px-3 py-1.5 rounded-lg text-sm text-[#8b949e]">{truncateAddress(currentWalletAddress)}</code>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleCopyAddress}
                      className="p-1.5 hover:bg-[#21262d] rounded-lg transition-colors">
                      {copied ? <CheckCircle size={16} className="text-[#3fb950]" /> : <Copy size={16} className="text-[#8b949e]" />}
                    </motion.button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-[#21262d] rounded-xl">
                    <span className="text-sm text-[#8b949e]">Сеть</span>
                    <span className="text-sm text-[#f0f6fc] font-medium">Polygon Mainnet</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#21262d] rounded-xl">
                    <span className="text-sm text-[#8b949e]">Кошелёк</span>
                    <span className="text-sm text-[#f0f6fc] font-medium capitalize">{store.wallet.walletType || 'MetaMask'}</span>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => { setShowProfileModal(false); setShowEditProfileModal(true); }}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-[#21262d] hover:bg-[#282c34] text-[#f0f6fc] rounded-xl transition-colors">
                    <Settings size={20} /><span>Редактировать профиль</span>
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleDisconnect}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors">
                    <LogOut size={20} /><span>Отключить кошелёк</span>
                  </motion.button>
                </div>
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
              className="bg-[#161b22] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#30363d]">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-[#f0f6fc]">Редактировать профиль</h3>
                  <button onClick={() => setShowEditProfileModal(false)} className="p-1.5 hover:bg-[#21262d] rounded-full transition-colors">
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
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b949e]" />
                      <input type="text" placeholder="Введите имя" value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full bg-[#21262d] text-[#f0f6fc] placeholder-[#484f58] rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f8af5]" />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-[#21262d] rounded-xl">
                    <p className="text-xs text-[#8b949e] mb-2">Предпросмотр:</p>
                    <div className="flex items-center gap-3">
                      <img src={`/ava/${selectedAvatar}.png`} alt="Preview" className="w-12 h-12 rounded-full" />
                      <div>
                        <p className="font-medium text-[#f0f6fc]">{userName || 'Web3 User'}</p>
                        <p className="text-xs text-[#8b949e]">{truncateAddress(currentWalletAddress)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="w-full py-3.5 bg-gradient-to-r from-[#2f8af5] to-[#6366f1] text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSavingProfile ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      'Сохранить'
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
