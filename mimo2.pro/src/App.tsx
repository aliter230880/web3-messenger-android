import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Lock,
  MessageCircle,
  Plus,
  X,
  ChevronRight,
  Loader2,
  Copy,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { useStore, Chat, Message } from './store';
import { useWallet } from './hooks/useWallet';

// Mock data
const generateMockData = () => {
  const chats: Chat[] = [
    {
      id: 'chat_1',
      contactAddress: '0x1234567890abcdef1234567890abcdef12345678',
      contactName: 'Alice Web3',
      contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
      messages: [],
      unreadCount: 3,
      lastMessage: 'Привет! Как дела с проектом? 🚀',
      lastMessageTime: Date.now() - 120000,
      isOnline: true,
    },
    {
      id: 'chat_2',
      contactAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
      contactName: 'Bob DeFi',
      contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
      messages: [],
      unreadCount: 0,
      lastMessage: 'Готово, проверь кошелёк',
      lastMessageTime: Date.now() - 3600000,
      isOnline: false,
    },
    {
      id: 'chat_3',
      contactAddress: '0x9876543210fedcba9876543210fedcba98765432',
      contactName: 'Crypto Dev 🧑‍💻',
      contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Crypto',
      messages: [],
      unreadCount: 1,
      lastMessage: 'Смарт-контракт задеплоен! 🎉',
      lastMessageTime: Date.now() - 7200000,
      isOnline: true,
    },
  ];

  const messagesMap: Record<string, Message[]> = {
    'chat_1': [
      { id: 'm1', chatId: 'chat_1', senderAddress: '0x1234567890abcdef1234567890abcdef12345678', receiverAddress: '0xMyWallet', content: 'Привет! 👋', timestamp: Date.now() - 600000, isSent: true, isRead: true },
      { id: 'm2', chatId: 'chat_1', senderAddress: '0xMyWallet', receiverAddress: '0x1234567890abcdef1234567890abcdef12345678', content: 'Привет! Как проекты?', timestamp: Date.now() - 580000, isSent: true, isRead: true, isDelivered: true },
      { id: 'm3', chatId: 'chat_1', senderAddress: '0x1234567890abcdef1234567890abcdef12345678', receiverAddress: '0xMyWallet', content: 'Отлично! Deployed новый контракт на Polygon', timestamp: Date.now() - 300000, isSent: true, isRead: true },
    ],
  };

  return { chats, messagesMap };
};

const { chats: initialChats, messagesMap: initialMessages } = generateMockData();

// Utility functions
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'сейчас';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин`;
  if (diff < 86400000) return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

// MetaMask SVG Icon
const MetaMaskIcon = ({ className = "w-10 h-10" }) => (
  <svg className={className} viewBox="0 0 318.6 318.6">
    <polygon fill="#E2761B" stroke="#E2761B" points="274.1,35.5 174.6,109.4 193,65.8"/>
    <g>
      <polygon fill="#E4761B" stroke="#E4761B" points="44.4,35.5 137.7,110.6 120.2,65.8"/>
      <polygon fill="#E4761B" stroke="#E4761B" points="238.7,124.6 260.3,154.6 290.7,158.3 274.1,135.3"/>
      <polygon fill="#E4761B" stroke="#E4761B" points="27.3,124.6 43.9,135.3 27.9,158.3 57.8,154.6"/>
      <polygon fill="#E4761B" stroke="#E4761B" points="103.6,189.6 88.5,223.5 127.3,225.7 124.6,187.7"/>
      <polygon fill="#E4761B" stroke="#E4761B" points="214.9,189.6 193.1,187.7 190.4,225.7 229.2,223.5"/>
      <polygon fill="#D7C1B3" stroke="#D7C1B3" points="127.3,225.7 140.7,257.2 170.1,257.2 172.9,223.5"/>
      <polygon fill="#D7C1B3" stroke="#D7C1B3" points="127.3,225.7 88.5,223.5 95.2,257.2 140.7,257.2"/>
      <polygon fill="#D7C1B3" stroke="#D7C1B3" points="229.2,223.5 190.4,225.7 172.9,257.2 218.4,257.2"/>
      <polygon fill="#D7C1B3" stroke="#D7C1B3" points="229.2,223.5 218.4,257.2 257.2,257.2 263.9,223.5"/>
      <polygon fill="#233447" stroke="#233447" points="260.3,154.6 274.1,135.3 290.7,158.3"/>
      <polygon fill="#233447" stroke="#233447" points="27.3,158.3 43.9,135.3 57.8,154.6"/>
      <polygon fill="#CD6116" stroke="#CD6116" points="103.6,189.6 124.6,187.7 127.3,225.7 140.7,257.2 127.3,257.2 88.5,223.5"/>
      <polygon fill="#CD6116" stroke="#CD6116" points="214.9,189.6 193.1,187.7 229.2,223.5 257.2,257.2 218.4,257.2 190.4,225.7"/>
      <polygon fill="#E4751F" stroke="#E4751F" points="88.5,223.5 95.2,257.2 127.3,257.2 127.3,225.7 140.7,257.2 170.1,257.2 172.9,223.5 190.4,225.7 229.2,223.5 263.9,223.5 257.2,257.2 218.4,257.2 172.9,257.2 140.7,257.2 95.2,257.2"/>
      <polygon fill="#F6851B" stroke="#F6851B" points="174.6,109.4 193,65.8 214.9,189.6 124.6,187.7"/>
      <polygon fill="#F6851B" stroke="#F6851B" points="137.7,110.6 120.2,65.8 124.6,187.7 214.9,189.6"/>
      <polygon fill="#763D16" stroke="#763D16" points="274.1,35.5 238.7,124.6 214.9,189.6 174.6,109.4 193,65.8"/>
      <polygon fill="#763D16" stroke="#763D16" points="44.4,35.5 120.2,65.8 124.6,187.7 103.6,189.6 57.8,154.6"/>
      <polygon fill="#F6851B" stroke="#F6851B" points="290.7,158.3 274.1,135.3 274.1,35.5 238.7,124.6 260.3,154.6"/>
      <polygon fill="#F6851B" stroke="#F6851B" points="27.9,158.3 43.9,135.3 44.4,35.5 57.8,154.6 103.6,189.6 120.2,65.8 137.7,110.6"/>
    </g>
  </svg>
);

export default function App() {
  const store = useStore();
  const { connect, disconnect, error: walletError } = useWallet();
  
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [walletScreen, setWalletScreen] = useState<'picker' | 'connecting' | 'success'>('picker');
  const [localChats, setLocalChats] = useState<Chat[]>(initialChats);
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>(initialMessages);
  const [copied, setCopied] = useState(false);
  const [newChatAddress, setNewChatAddress] = useState('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentWalletAddress = store.wallet.address || '';
  const selectedChat = localChats.find(c => c.id === selectedChatId);
  const currentMessages = selectedChatId ? (localMessages[selectedChatId] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  useEffect(() => {
    if (walletError) {
      setConnectionError(walletError);
      setWalletScreen('picker');
    }
  }, [walletError]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedChatId) return;
    
    const targetChat = localChats.find(c => c.id === selectedChatId);
    if (!targetChat) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      chatId: selectedChatId,
      senderAddress: currentWalletAddress,
      receiverAddress: targetChat.contactAddress,
      content: messageInput.trim(),
      timestamp: Date.now(),
      isSent: true,
      isDelivered: false,
    };

    setLocalMessages(prev => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), newMessage]
    }));

    setLocalChats(prev => prev.map(chat => 
      chat.id === selectedChatId 
        ? { ...chat, lastMessage: messageInput.trim(), lastMessageTime: Date.now() }
        : chat
    ));

    setMessageInput('');

    setTimeout(() => {
      setLocalMessages(prev => ({
        ...prev,
        [selectedChatId]: (prev[selectedChatId] || []).map(m => 
          m.id === newMessage.id ? { ...m, isDelivered: true } : m
        )
      }));
    }, 500);

    setTimeout(() => {
      setLocalMessages(prev => ({
        ...prev,
        [selectedChatId]: (prev[selectedChatId] || []).map(m => 
          m.id === newMessage.id ? { ...m, isRead: true } : m
        )
      }));
    }, 2000);
  };

  const handleConnectWallet = async (walletType: 'metamask' | 'trustwallet' | 'walletconnect') => {
    setWalletScreen('connecting');
    setConnectionError(null);
    
    try {
      await connect(walletType);
      setWalletScreen('success');
      setTimeout(() => {
        setShowWalletModal(false);
        setWalletScreen('picker');
      }, 1500);
    } catch (err: any) {
      console.error('Connection failed:', err);
      setConnectionError(err.message);
      setWalletScreen('picker');
    }
  };

  // Social login handlers - open OAuth in new window
  const handleSocialLogin = (provider: string) => {
    const urls: Record<string, string> = {
      google: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=' + encodeURIComponent(window.location.origin + '/auth/google') + '&response_type=code&scope=openid%20email%20profile',
      twitter: 'https://twitter.com/i/oauth2/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=' + encodeURIComponent(window.location.origin + '/auth/twitter') + '&response_type=code&scope=tweet.read%20users.read',
      discord: 'https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=' + encodeURIComponent(window.location.origin + '/auth/discord') + '&response_type=code&scope=identify%20email',
    };
    
    // For demo: show alert. In production: open OAuth popup
    alert(`${provider} авторизация: в продакшене здесь будет OAuth для создания кошелька через LoginFactory контракт (0xF3D8c9B1e209DD3b8f2F70a1A896f3F3f5cd77C8)`);
    
    // Uncomment for real OAuth:
    // window.open(urls[provider], '_blank', 'width=500,height=600');
  };

  const handleCloseModal = () => {
    setShowWalletModal(false);
    setWalletScreen('picker');
    setConnectionError(null);
  };

  const handleNewChat = () => {
    if (!newChatAddress.trim()) return;
    
    const newChat: Chat = {
      id: `chat_${Date.now()}`,
      contactAddress: newChatAddress,
      contactName: truncateAddress(newChatAddress),
      contactAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newChatAddress}`,
      messages: [],
      unreadCount: 0,
      lastMessage: 'Новый чат',
      lastMessageTime: Date.now(),
      isOnline: Math.random() > 0.5,
    };

    setLocalChats(prev => [newChat, ...prev]);
    setNewChatAddress('');
    setShowNewChatModal(false);
    setSelectedChatId(newChat.id);
  };

  const handleCopyAddress = async () => {
    await copyToClipboard(currentWalletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    disconnect();
    setShowProfileModal(false);
  };

  const filteredChats = useMemo(() => {
    return localChats.filter(chat => 
      chat.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.contactAddress.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [localChats, searchQuery]);

  const totalUnread = useMemo(() => {
    return localChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
  }, [localChats]);

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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2f8af5] to-[#6366f1] flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <MessageCircle size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#f0f6fc]">Web3Gram</h1>
                  {totalUnread > 0 && (
                    <span className="text-xs text-[#8b949e]">{totalUnread} непрочитанных</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {store.wallet.isConnected && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowNewChatModal(true)}
                    className="p-2.5 hover:bg-[#21262d] rounded-full transition-colors"
                  >
                    <Edit size={20} className="text-[#8b949e]" />
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => store.wallet.isConnected ? setShowProfileModal(true) : setShowWalletModal(true)}
                  className="p-2.5 hover:bg-[#21262d] rounded-full transition-colors relative"
                >
                  {store.wallet.isConnected ? (
                    <>
                      <img 
                        src={store.currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentWalletAddress}`}
                        alt="Profile"
                        className="w-6 h-6 rounded-full"
                      />
                      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-[#3fb950] rounded-full border-2 border-[#161b22]" />
                    </>
                  ) : (
                    <Wallet size={20} className="text-[#8b949e]" />
                  )}
                </motion.button>
              </div>
            </header>

            <div className="px-3 py-2">
              <div className="flex items-center bg-[#21262d] rounded-xl px-3 py-2.5">
                <Search size={18} className="text-[#8b949e] mr-2 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Поиск чатов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-[#f0f6fc] placeholder-[#8b949e] text-sm focus:outline-none"
                />
              </div>
            </div>

            {store.wallet.isConnected && (
              <div className="px-4 py-2 flex items-center gap-2 text-xs">
                <Shield size={14} className="text-[#3fb950]" />
                <span className="text-[#3fb950]">E2E шифрование</span>
                <span className="text-[#8b949e]">• Polygon • XMTP</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {filteredChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#21262d] flex items-center justify-center mb-4">
                    <MessageCircle size={32} className="text-[#484f58]" />
                  </div>
                  <p className="text-[#8b949e] font-medium">Нет чатов</p>
                  <p className="text-[#484f58] text-sm mt-1">Начните новый диалог</p>
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <motion.button
                    key={chat.id}
                    onClick={() => {
                      setSelectedChatId(chat.id);
                      setLocalChats(prev => prev.map(c => 
                        c.id === chat.id ? { ...c, unreadCount: 0 } : c
                      ));
                      if (window.innerWidth < 768) setShowSidebar(false);
                    }}
                    whileHover={{ backgroundColor: 'rgba(48, 54, 61, 0.5)' }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors relative ${
                      selectedChatId === chat.id ? 'bg-[#1c2128]' : ''
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={chat.contactAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.contactAddress}`}
                        alt={chat.contactName}
                        className="w-[52px] h-[52px] rounded-full"
                      />
                      {chat.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#3fb950] rounded-full border-2 border-[#161b22]" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#f0f6fc] truncate">{chat.contactName}</span>
                        <span className="text-xs text-[#8b949e] flex-shrink-0 ml-2">
                          {formatTime(chat.lastMessageTime || Date.now())}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-[#8b949e] truncate pr-2">{chat.lastMessage}</p>
                        {chat.unreadCount > 0 && (
                          <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-2 px-2 py-0.5 bg-[#2f8af5] text-white text-xs rounded-full flex-shrink-0 min-w-[20px] text-center"
                          >
                            {chat.unreadCount}
                          </motion.span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>

            {!store.wallet.isConnected && (
              <div className="p-4 border-t border-[#30363d]">
                <button
                  onClick={() => setShowWalletModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#2f8af5] to-[#6366f1] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  <Wallet size={20} />
                  Подключить кошелёк
                </button>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-[#0d1117] relative">
        {selectedChatId && selectedChat ? (
          <>
            <header className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-[#30363d] safe-top">
              <div className="flex items-center gap-3">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSidebar(true)}
                  className="p-2 hover:bg-[#21262d] rounded-full transition-colors md:hidden"
                >
                  <ArrowLeft size={20} className="text-[#8b949e]" />
                </motion.button>
                <div className="relative">
                  <img
                    src={selectedChat.contactAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedChat.contactAddress}`}
                    alt={selectedChat.contactName}
                    className="w-10 h-10 rounded-full"
                  />
                  {selectedChat.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#3fb950] rounded-full border-2 border-[#161b22]" />
                  )}
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
              <span>Сообщения защищены сквозным шифрованием</span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 bg-[#0d1117]">
              {currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-[#161b22] flex items-center justify-center mb-4">
                    <Lock size={28} className="text-[#484f58]" />
                  </div>
                  <p className="text-[#8b949e]">Нет сообщений</p>
                  <p className="text-[#484f58] text-sm mt-1">Начните диалог</p>
                </div>
              ) : (
                <>
                  {currentMessages.map((message, index) => {
                    const isMe = message.senderAddress === currentWalletAddress || message.senderAddress === '0xMyWallet';
                    const showAvatar = !isMe && (index === 0 || currentMessages[index - 1]?.senderAddress !== message.senderAddress);
                    
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}
                      >
                        <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : ''}`}>
                          {!isMe && showAvatar && (
                            <img
                              src={selectedChat.contactAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedChat.contactAddress}`}
                              alt="Avatar"
                              className="w-8 h-8 rounded-full flex-shrink-0"
                            />
                          )}
                          {!isMe && !showAvatar && <div className="w-8" />}
                          
                          <div className="flex flex-col">
                            {showAvatar && !isMe && (
                              <span className="text-xs text-[#2f8af5] ml-3 mb-1">{selectedChat.contactName}</span>
                            )}
                            <div
                              className={`px-4 py-2.5 ${
                                isMe
                                  ? 'bg-gradient-to-br from-[#2b5278] to-[#1e3a5f] rounded-[18px] rounded-br-[6px]'
                                  : 'bg-[#182533] rounded-[18px] rounded-bl-[6px]'
                              }`}
                            >
                              <p className="text-[#f0f6fc] text-[15px] whitespace-pre-wrap break-words leading-relaxed">
                                {message.content}
                              </p>
                              <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                <span className="text-[11px] text-[#8b949e]/70">
                                  {new Date(message.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isMe && (
                                  message.isRead ? (
                                    <CheckCheck size={14} className="text-[#2f8af5]" />
                                  ) : message.isDelivered ? (
                                    <CheckCheck size={14} className="text-[#8b949e]" />
                                  ) : (
                                    <Check size={14} className="text-[#8b949e]" />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
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
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Написать сообщение..."
                    rows={1}
                    className="flex-1 bg-transparent text-[#f0f6fc] placeholder-[#8b949e] text-[15px] resize-none focus:outline-none max-h-32"
                  />
                </div>
                {messageInput.trim() ? (
                  <motion.button
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSendMessage}
                    className="p-2.5 bg-[#2f8af5] hover:bg-[#1a73e8] rounded-full transition-colors flex-shrink-0 shadow-lg shadow-blue-500/30"
                  >
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
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-center max-w-md"
            >
              <motion.div 
                animate={{ boxShadow: ['0 0 20px rgba(47,138,245,0.3)', '0 0 40px rgba(47,138,245,0.5)', '0 0 20px rgba(47,138,245,0.3)'] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-28 h-28 mx-auto mb-8 rounded-full bg-gradient-to-br from-[#2f8af5] to-[#6366f1] flex items-center justify-center"
              >
                <MessageCircle size={56} className="text-white" />
              </motion.div>
              <h2 className="text-3xl font-bold text-[#f0f6fc] mb-3">Web3Gram</h2>
              <p className="text-[#8b949e] mb-8 text-lg">
                Безопасный мессенджер на базе блокчейна Polygon с E2E шифрованием
              </p>
              
              {!store.wallet.isConnected ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowWalletModal(true)}
                  className="flex items-center gap-3 mx-auto px-8 py-4 bg-gradient-to-r from-[#2f8af5] to-[#6366f1] text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl transition-shadow"
                >
                  <Wallet size={24} />
                  Подключить кошелёк
                </motion.button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-[#3fb950]">
                    <Shield size={18} />
                    <span className="font-medium">Кошелёк подключён</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <code className="bg-[#21262d] px-3 py-1.5 rounded-lg text-[#8b949e]">
                      {truncateAddress(currentWalletAddress)}
                    </code>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleCopyAddress}
                      className="p-1.5 hover:bg-[#21262d] rounded-lg transition-colors"
                    >
                      {copied ? <CheckCircle size={16} className="text-[#3fb950]" /> : <Copy size={16} className="text-[#8b949e]" />}
                    </motion.button>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowNewChatModal(true)}
                    className="flex items-center gap-2 mx-auto px-6 py-3 bg-[#21262d] hover:bg-[#282c34] text-[#f0f6fc] rounded-xl font-medium transition-colors"
                  >
                    <Plus size={20} />
                    Новый чат
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#161b22] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#30363d]"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-[#f0f6fc]">
                    {walletScreen === 'success' ? 'Подключено!' : 'Подключить кошелёк'}
                  </h3>
                  <button onClick={handleCloseModal} className="p-1.5 hover:bg-[#21262d] rounded-full transition-colors">
                    <X size={20} className="text-[#8b949e]" />
                  </button>
                </div>

                {connectionError && walletScreen === 'picker' && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {connectionError}
                  </div>
                )}

                {walletScreen === 'picker' && (
                  <div className="space-y-3">
                    {/* MetaMask */}
                    <button
                      onClick={() => handleConnectWallet('metamask')}
                      className="w-full flex items-center gap-4 p-4 bg-[#21262d] hover:bg-[#282c34] rounded-xl transition-colors group"
                    >
                      <MetaMaskIcon className="w-10 h-10" />
                      <div className="text-left flex-1">
                        <p className="font-medium text-[#f0f6fc] group-hover:text-white">MetaMask</p>
                        <p className="text-xs text-[#8b949e]">Расширение / Мобильный</p>
                      </div>
                      <ChevronRight size={20} className="text-[#484f58] group-hover:text-[#8b949e] transition-colors" />
                    </button>

                    {/* Trust Wallet */}
                    <button
                      onClick={() => handleConnectWallet('trustwallet')}
                      className="w-full flex items-center gap-4 p-4 bg-[#21262d] hover:bg-[#282c34] rounded-xl transition-colors group"
                    >
                      <div className="w-10 h-10 bg-[#3375bb] rounded-xl flex items-center justify-center">
                        <Wallet size={24} className="text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-medium text-[#f0f6fc] group-hover:text-white">Trust Wallet</p>
                        <p className="text-xs text-[#8b949e]">Через window.ethereum</p>
                      </div>
                      <ChevronRight size={20} className="text-[#484f58] group-hover:text-[#8b949e] transition-colors" />
                    </button>

                    {/* Divider */}
                    <div className="relative py-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#30363d]" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-[#161b22] px-3 text-[#8b949e]">или через соцсети</span>
                      </div>
                    </div>

                    {/* Social Login Options */}
                    <div className="grid grid-cols-3 gap-3">
                      <button onClick={() => handleSocialLogin('google')} className="flex flex-col items-center gap-2 p-4 bg-[#21262d] hover:bg-[#282c34] rounded-xl transition-colors group">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        </div>
                        <span className="text-xs text-[#8b949e] group-hover:text-white">Google</span>
                      </button>

                      <button onClick={() => handleSocialLogin('twitter')} className="flex flex-col items-center gap-2 p-4 bg-[#21262d] hover:bg-[#282c34] rounded-xl transition-colors group">
                        <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </div>
                        <span className="text-xs text-[#8b949e] group-hover:text-white">X</span>
                      </button>

                      <button onClick={() => handleSocialLogin('discord')} className="flex flex-col items-center gap-2 p-4 bg-[#21262d] hover:bg-[#282c34] rounded-xl transition-colors group">
                        <div className="w-10 h-10 bg-[#5865F2] rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                        </div>
                        <span className="text-xs text-[#8b949e] group-hover:text-white">Discord</span>
                      </button>
                    </div>

                    <div className="flex items-start gap-3 text-xs text-[#8b949e] pt-4">
                      <Lock size={14} className="text-[#3fb950] flex-shrink-0 mt-0.5" />
                      <p>Подключение через LoginFactory контракт на Polygon (0xF3D8c9B1e209DD3b8f2F70a1A896f3F3f5cd77C8)</p>
                    </div>
                  </div>
                )}

                {walletScreen === 'connecting' && (
                  <div className="py-8 text-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-16 h-16 mx-auto mb-6">
                      <Loader2 size={64} className="text-[#2f8af5]" />
                    </motion.div>
                    <p className="text-[#f0f6fc] text-lg font-medium mb-2">Подключение...</p>
                    <p className="text-sm text-[#8b949e] mb-4">Подтвердите в кошельке</p>
                    <button onClick={handleCloseModal} className="text-[#8b949e] text-sm hover:text-[#f0f6fc] underline">
                      Отмена
                    </button>
                  </div>
                )}

                {walletScreen === 'success' && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }} className="py-8 text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, delay: 0.1 }} className="w-20 h-20 mx-auto mb-6 bg-[#3fb950] rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
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

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChatModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNewChatModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-[#161b22] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#30363d]">
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
                    <input
                      type="text"
                      placeholder="0x..."
                      value={newChatAddress}
                      onChange={(e) => setNewChatAddress(e.target.value)}
                      className="w-full bg-[#21262d] text-[#f0f6fc] placeholder-[#484f58] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2f8af5]"
                    />
                  </div>

                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleNewChat} className="w-full py-3.5 bg-gradient-to-r from-[#2f8af5] to-[#6366f1] text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20">
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowProfileModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-[#161b22] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#30363d]">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-[#f0f6fc]">Профиль</h3>
                  <button onClick={() => setShowProfileModal(false)} className="p-1.5 hover:bg-[#21262d] rounded-full transition-colors">
                    <X size={20} className="text-[#8b949e]" />
                  </button>
                </div>

                <div className="text-center mb-6">
                  <img src={store.currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentWalletAddress}`} alt="Avatar" className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-[#2f8af5]" />
                  <h4 className="text-lg font-semibold text-[#f0f6fc]">{store.currentUser?.name || 'Web3 User'}</h4>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <code className="bg-[#21262d] px-3 py-1.5 rounded-lg text-sm text-[#8b949e]">{truncateAddress(currentWalletAddress)}</code>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleCopyAddress} className="p-1.5 hover:bg-[#21262d] rounded-lg transition-colors">
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

                <div className="mt-6">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleDisconnect} className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors">
                    <LogOut size={20} /><span>Отключить кошелёк</span>
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
