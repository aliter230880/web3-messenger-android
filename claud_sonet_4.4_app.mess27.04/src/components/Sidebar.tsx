import { useState } from 'react';
import {
  MessageCircle,
  Users,
  Settings,
  Search,
  Plus,
  LogOut,
  ChevronDown,
  Bell,
  Moon,
  Sun,
  Wifi,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatAddress } from '../utils/wallet';
import Avatar from './Avatar';
import ChatListItem from './ChatListItem';
import { wsClient } from '../utils/ws';

export default function Sidebar() {
  const {
    walletAddress,
    ensName,
    networkName,
    chats,
    activeChatId,
    currentView,
    searchQuery,
    pinnedChats,
    theme,
    setActiveChat,
    setView,
    setSearchQuery,
    disconnectWallet,
    toggleTheme,
  } = useStore();

  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = ensName || (walletAddress ? formatAddress(walletAddress, 4) : '');

  const filteredChats = chats
    .filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.participants.some((p) => p.toLowerCase().includes(q)) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      // Pinned first
      const aPinned = pinnedChats.includes(a.id) ? 1 : 0;
      const bPinned = pinnedChats.includes(b.id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return b.updatedAt - a.updatedAt;
    });

  const totalUnread = chats.reduce((sum, c) => sum + c.unread, 0);

  const handleDisconnect = () => {
    wsClient.disconnect();
    disconnectWallet();
    setMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#12121f] border-r border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 hover:bg-white/5 rounded-xl px-2 py-1.5 transition-colors"
        >
          <Avatar
            address={walletAddress || '0x0'}
            name={ensName || undefined}
            size="sm"
            status="online"
          />
          <div className="text-left">
            <div className="text-sm font-semibold text-white leading-none">{displayName}</div>
            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Wifi className="w-3 h-3 text-green-400" />
              <span>{networkName}</span>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 ml-1 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            title="Сменить тему"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setView('new-chat')}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            title="Новый чат"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div className="absolute top-16 left-3 z-50 bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden w-56">
          <div className="p-3 border-b border-white/5">
            <div className="text-xs text-gray-500 mb-1">Адрес кошелька</div>
            <div className="text-sm text-white font-mono">
              {walletAddress ? formatAddress(walletAddress, 6) : ''}
            </div>
          </div>
          <div className="p-1">
            {[
              { icon: Bell, label: 'Уведомления', action: () => setMenuOpen(false) },
              { icon: Settings, label: 'Настройки', action: () => { setView('settings'); setMenuOpen(false); } },
            ].map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                onClick={action}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl text-sm transition-colors"
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
            <div className="border-t border-white/5 mt-1 pt-1">
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl text-sm transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Отключить кошелёк
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nav Tabs */}
      <div className="flex items-center gap-1 px-3 py-2">
        {[
          { id: 'chats', icon: MessageCircle, label: 'Чаты', badge: totalUnread },
          { id: 'contacts', icon: Users, label: 'Контакты' },
          { id: 'settings', icon: Settings, label: 'Настройки' },
        ].map(({ id, icon: Icon, label, badge }) => (
          <button
            key={id}
            onClick={() => setView(id as Parameters<typeof setView>[0])}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-medium transition-all relative
              ${currentView === id
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
          >
            <div className="relative">
              <Icon className="w-4 h-4" />
              {badge && badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-purple-600 text-white text-[10px] font-bold px-1">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5 scrollbar-thin">
        {currentView === 'chats' && (
          <>
            {filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageCircle className="w-12 h-12 text-gray-600 mb-3" />
                <p className="text-gray-500 text-sm">Нет чатов</p>
                <button
                  onClick={() => setView('new-chat')}
                  className="mt-3 text-purple-400 hover:text-purple-300 text-sm underline"
                >
                  Создать новый чат
                </button>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  active={activeChatId === chat.id}
                  onClick={() => setActiveChat(chat.id)}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
