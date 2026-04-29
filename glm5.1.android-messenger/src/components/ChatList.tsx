import { useState, useEffect } from 'react';
import {
  Menu, Search, X, Users, Settings, Bookmark, UserPlus,
  Globe, Shield, VolumeX, Pin, Check, CheckCheck,
  Pencil, Moon, LogOut, Wallet
} from 'lucide-react';
import { useStore, Chat } from '../store/useStore';
import { Avatar } from './Avatar';
import { formatAddress } from '../lib/web3';
import { format, isToday, isYesterday, isThisYear } from 'date-fns';
import { ru } from 'date-fns/locale';

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Вчера';
  if (isThisYear(date)) return format(date, 'd MMM', { locale: ru });
  return format(date, 'dd.MM.yyyy');
}

function ChatItem({ chat, onClick, userAddress }: { chat: Chat; onClick: () => void; userAddress: string }) {
  const isOwn = chat.lastMessage?.senderId === userAddress;
  const msgPreview = chat.lastMessage?.content || '';
  const time = chat.lastMessage?.timestamp;
  const isChannel = chat.type === 'channel';
  const isGroup = chat.type === 'group';
  const isSaved = chat.id === 'chat_saved';

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors duration-75 select-none hover:bg-[#202d3b] active:bg-[#2a3a4a]"
    >
      {/* Avatar 54px */}
      <Avatar
        name={chat.name}
        address={chat.address || chat.id}
        size="chat"
        isOnline={chat.isOnline && !isGroup && !isChannel}
        type={isSaved ? 'saved' : isChannel ? 'channel' : isGroup ? 'group' : 'private'}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Row 1: Name + Time */}
        <div className="flex items-baseline justify-between gap-2 mb-[3px]">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {chat.pinned && !isSaved && (
              <Pin size={11} className="text-[#6c7c8c] flex-shrink-0 rotate-45" />
            )}
            <span className="text-[#e0eaf3] font-semibold text-[16px] truncate leading-tight">
              {chat.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {chat.muted && <VolumeX size={13} className="text-[#6c7c8c]" />}
            {time && (
              <span className={`text-[13px] leading-none ${chat.unreadCount > 0 ? 'text-[#2aabee]' : 'text-[#6c7c8c]'}`}>
                {formatTime(time)}
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Preview + Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {isOwn && chat.lastMessage && (
              <span className="flex items-center flex-shrink-0 mr-0.5">
                {chat.lastMessage.status === 'read' ? (
                  <CheckCheck size={16} className="text-[#4dcd5e]" />
                ) : chat.lastMessage.status === 'delivered' ? (
                  <CheckCheck size={16} className="text-[#6c7c8c]" />
                ) : (
                  <Check size={16} className="text-[#6c7c8c]" />
                )}
              </span>
            )}
            {(isChannel || isGroup) && chat.lastMessage && !isOwn && (
              <span className="text-[#2aabee] text-[15px] font-medium truncate flex-shrink-0">
                {chat.lastMessage.senderName}:&nbsp;
              </span>
            )}
            <p className="text-[#8899a8] text-[15px] truncate leading-snug">
              {msgPreview}
            </p>
          </div>
          {chat.unreadCount > 0 && (
            <div className={`flex-shrink-0 min-w-[23px] h-[23px] rounded-full flex items-center justify-center ${
              chat.muted ? 'bg-[#4a5568]' : 'bg-[#2aabee]'
            }`}>
              <span className="text-white text-[13px] font-bold leading-none px-1.5">
                {chat.unreadCount}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatList() {
  const {
    chats, setActiveChat, wallet, setActivePanel,
    searchQuery, setSearchQuery, sidebarOpen, setSidebarOpen,
    markAsRead, user
  } = useStore();
  const [showSearch, setShowSearch] = useState(false);

  const filtered = chats.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.lastMessage?.content || '').toLowerCase().includes(q)
    );
  });

  const pinned = filtered.filter((c) => c.pinned);
  const regular = filtered.filter((c) => !c.pinned);

  const handleChatClick = (chat: Chat) => {
    setActiveChat(chat);
    markAsRead(chat.id);
    setShowSearch(false);
    setSearchQuery('');
  };

  useEffect(() => {
    return () => setSearchQuery('');
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#17212b] relative">
      {/* Header — Telegram style */}
      <div className="flex items-center px-3 pt-2 pb-1 bg-[#17212b]">
        {showSearch ? (
          <div className="flex-1 flex items-center gap-2 bg-[#242f3d] rounded-[22px] px-4 py-[9px]">
            <Search size={18} className="text-[#8899a8] flex-shrink-0" />
            <input
              type="text"
              placeholder="Поиск"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent text-[#e0eaf3] text-[15px] placeholder-[#8899a8] outline-none min-w-0"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X size={18} className="text-[#8899a8]" />
              </button>
            )}
          </div>
        ) : (
          <>
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-[54px] h-[54px] rounded-full flex items-center justify-center transition-colors"
            >
              <Menu size={24} className="text-[#8899a8]" />
            </button>
            <h1 className="text-white font-semibold text-[19px] flex-1 ml-1">Web3 Messenger</h1>
            <button
              onClick={() => setShowSearch(true)}
              className="w-[54px] h-[54px] rounded-full flex items-center justify-center transition-colors"
            >
              <Search size={22} className="text-[#8899a8]" />
            </button>
          </>
        )}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {pinned.length > 0 && (
          <>
            {pinned.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                onClick={() => handleChatClick(chat)}
                userAddress={wallet?.address || ''}
              />
            ))}
            {regular.length > 0 && (
              <div className="h-px bg-[#1e2c3a] mx-4" />
            )}
          </>
        )}
        {regular.map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            onClick={() => handleChatClick(chat)}
            userAddress={wallet?.address || ''}
          />
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-in">
            <Search size={48} className="text-[#3a4a5a] mb-4" />
            <p className="text-[#6c7c8c] text-[15px] text-center">Чаты не найдены</p>
          </div>
        )}
      </div>

      {/* FAB — Telegram pencil */}
      <button
        onClick={() => setActivePanel('contacts')}
        className="absolute bottom-5 right-5 w-[56px] h-[56px] rounded-full bg-[#2aabee] hover:bg-[#229ED9] active:bg-[#1a7fb0] shadow-[0_3px_5px_-1px_rgba(0,0,0,0.2),0_6px_10px_0_rgba(0,0,0,0.14),0_1px_18px_0_rgba(0,0,0,0.12)] flex items-center justify-center transition-all active:scale-90"
      >
        <Pencil size={22} className="text-white" />
      </button>

      {/* Sidebar Drawer */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed top-0 left-0 bottom-0 w-[280px] max-w-[85vw] bg-[#17212b] z-50 flex flex-col animate-slide-left shadow-2xl">
            {/* Profile header */}
            <div className="pt-3 pb-3 px-5 bg-[#1e2c3a]">
              <div className="flex items-center gap-3.5 mb-3.5">
                <Avatar
                  name={user?.name || ''}
                  address={wallet?.address || ''}
                  size="lg"
                  isOnline={true}
                  type="private"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-[15px] truncate leading-tight">{user?.name}</p>
                  <p className="text-[#8899a8] text-[13px] truncate mt-0.5">
                    {formatAddress(wallet?.address || '', 10)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-[#17212b]/60 rounded-lg px-3 py-2">
                <Wallet size={14} className="text-[#2aabee] flex-shrink-0" />
                <span className="text-[#8899a8] text-[13px]">{wallet?.balance} ETH</span>
                <span className="text-[#3a4a5a] text-[13px]">·</span>
                <span className="text-[#8899a8] text-[13px]">{wallet?.networkName}</span>
              </div>
            </div>

            {/* Menu items */}
            <div className="flex-1 overflow-y-auto py-1">
              <MenuSection>
                <MenuItem icon={UserPlus} label="Новый контакт" onClick={() => { setSidebarOpen(false); setActivePanel('contacts'); }} />
                <MenuItem icon={Users} label="Контакты" onClick={() => { setSidebarOpen(false); setActivePanel('contacts'); }} />
                <MenuItem icon={Bookmark} label="Избранное" onClick={() => { setSidebarOpen(false); }} />
              </MenuSection>
              <div className="h-px bg-[#1e2c3a] mx-3" />
              <MenuSection>
                <MenuItem icon={Globe} label="Web3 Explorer" onClick={() => {}} />
                <MenuItem icon={Shield} label="Приватность" onClick={() => {}} />
                <MenuItem icon={Moon} label="Тёмная тема" onClick={() => {}} badge="ВКЛ" />
              </MenuSection>
              <div className="h-px bg-[#1e2c3a] mx-3" />
              <MenuSection>
                <MenuItem icon={Settings} label="Настройки" onClick={() => { setSidebarOpen(false); setActivePanel('settings'); }} />
                <MenuItem icon={LogOut} label="Отключить кошелёк" onClick={() => {}} danger />
              </MenuSection>
            </div>

            <div className="px-5 py-3 border-t border-[#1e2c3a]">
              <p className="text-[#5a6a7a] text-[12px] text-center">
                Web3 Messenger v2.0 · Aliterra
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuSection({ children }: { children: React.ReactNode }) {
  return <div className="py-0.5">{children}</div>;
}

function MenuItem({ icon: Icon, label, onClick, badge, danger }: {
  icon: any; label: string; onClick: () => void; badge?: string; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-5 px-5 py-[11px] hover:bg-[#202d3b] active:bg-[#2a3a4a] transition-colors"
    >
      <Icon size={21} className={danger ? 'text-[#e25555]' : 'text-[#8899a8]'} />
      <span className={`text-[15px] ${danger ? 'text-[#e25555]' : 'text-[#e0eaf3]'}`}>
        {label}
      </span>
      {badge && (
        <span className="ml-auto text-[12px] text-[#2aabee]">
          {badge}
        </span>
      )}
    </button>
  );
}
