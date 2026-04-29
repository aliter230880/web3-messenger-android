import { useState } from 'react';
import { Search, Edit, Settings, Users, Pin, BellOff, Check, CheckCheck } from 'lucide-react';
import { useStore, Chat, Message } from '../store/useStore';
import { Avatar } from './Avatar';
import { formatAddress } from '../lib/web3';
import { format, isToday, isYesterday } from 'date-fns';
import { generateMockMessages } from '../lib/mockData';

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'dd.MM.yy');
}

function MessagePreview({ msg, isOwn }: { msg: Message; isOwn: boolean }) {
  const statusIcon =
    msg.status === 'read' ? (
      <CheckCheck size={14} className="text-[#2aabee] flex-shrink-0" />
    ) : msg.status === 'delivered' ? (
      <CheckCheck size={14} className="text-[#6c7c8c] flex-shrink-0" />
    ) : (
      <Check size={14} className="text-[#6c7c8c] flex-shrink-0" />
    );

  return (
    <div className="flex items-center gap-1 min-w-0">
      {isOwn && statusIcon}
      <span className="text-[#8899a8] text-sm truncate">{msg.content}</span>
    </div>
  );
}

interface ChatItemProps {
  chat: Chat;
  isActive: boolean;
  onClick: () => void;
  userAddress: string;
}

function ChatItem({ chat, isActive, onClick, userAddress }: ChatItemProps) {
  const isOwn = chat.lastMessage?.senderId === userAddress;
  const senderPrefix =
    chat.type !== 'private' && chat.lastMessage && !isOwn
      ? `${chat.lastMessage.senderName.split('.')[0]}: `
      : '';

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 cursor-pointer rounded-xl mx-1 transition-colors duration-100 select-none ${
        isActive ? 'bg-[#2b5278]' : 'hover:bg-[#1e2c3a] active:bg-[#243040]'
      }`}
    >
      <div className="relative">
        <Avatar
          name={chat.name}
          address={chat.address}
          size="md"
          isOnline={chat.type === 'private' ? chat.isOnline : undefined}
          type={chat.type}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            {chat.pinned && <Pin size={12} className="text-[#8899a8] flex-shrink-0 rotate-45" />}
            <span className={`font-medium truncate ${isActive ? 'text-white' : 'text-[#e0eaf3]'}`}>
              {chat.name}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {chat.muted && <BellOff size={12} className="text-[#6c7c8c]" />}
            {chat.lastMessage && (
              <span className="text-[#8899a8] text-xs whitespace-nowrap">
                {formatTime(chat.lastMessage.timestamp)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            {chat.lastMessage ? (
              <div className="flex items-center gap-1 min-w-0">
                {senderPrefix && (
                  <span className="text-[#2aabee] text-sm flex-shrink-0">{senderPrefix}</span>
                )}
                <MessagePreview msg={chat.lastMessage} isOwn={!!isOwn} />
              </div>
            ) : (
              <span className="text-[#6c7c8c] text-sm italic">No messages yet</span>
            )}
          </div>
          {chat.unreadCount > 0 && (
            <div
              className={`flex-shrink-0 min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 text-xs font-bold ${
                chat.muted ? 'bg-[#3a4a5a] text-[#8899a8]' : 'bg-[#2aabee] text-white'
              }`}
            >
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatList() {
  const {
    chats,
    activeChat,
    setActiveChat,
    wallet,
    setActivePanel,
    searchQuery,
    setSearchQuery,
    markAsRead,
    setMessages,
  } = useStore();

  const [showMenu, setShowMenu] = useState(false);
  const { generateMockMessages } = require('../lib/mockData');

  const filtered = chats.filter((c) => {
    if (!searchQuery) return true;
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const pinned = filtered.filter((c) => c.pinned);
  const regular = filtered.filter((c) => !c.pinned);

  const handleChatClick = (chat: Chat) => {
    setActiveChat(chat);
    markAsRead(chat.id);
    if (wallet && !useStore.getState().messages[chat.id]) {
      setMessages(chat.id, generateMockMessages(chat.id, wallet.address));
    }
    setActivePanel('chats');
  };

  const totalUnread = chats.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <div className="flex flex-col h-full bg-[#17212b]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-9 h-9 rounded-full hover:bg-[#1e2c3a] flex items-center justify-center transition-colors relative"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect y="3" width="20" height="2" rx="1" fill="#8899a8"/>
            <rect y="9" width="20" height="2" rx="1" fill="#8899a8"/>
            <rect y="15" width="20" height="2" rx="1" fill="#8899a8"/>
          </svg>
          {totalUnread > 0 && (
            <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#2aabee] rounded-full flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">{totalUnread > 9 ? '9+' : totalUnread}</span>
            </div>
          )}
        </button>

        <h1 className="text-white font-semibold text-lg">Web3 Messenger</h1>

        <button
          onClick={() => setActivePanel('contacts')}
          className="w-9 h-9 rounded-full hover:bg-[#1e2c3a] flex items-center justify-center transition-colors"
        >
          <Edit size={18} className="text-[#8899a8]" />
        </button>
      </div>

      {/* Hamburger Menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute left-2 top-14 z-50 bg-[#1e2c3a] rounded-2xl shadow-2xl w-64 py-2 border border-[#2a3a4a]">
            <MenuWalletItem wallet={wallet} />
            <div className="h-px bg-[#2a3a4a] my-1" />
            {[
              { icon: Users, label: 'Contacts', panel: 'contacts' as const },
              { icon: Settings, label: 'Settings', panel: 'settings' as const },
            ].map(({ icon: Icon, label, panel }) => (
              <button
                key={label}
                onClick={() => { setActivePanel(panel); setShowMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#243040] text-left transition-colors"
              >
                <Icon size={20} className="text-[#8899a8]" />
                <span className="text-[#e0eaf3] font-medium">{label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 bg-[#1e2c3a] rounded-xl px-3 py-2">
          <Search size={16} className="text-[#6c7c8c] flex-shrink-0" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-[#e0eaf3] text-sm placeholder-[#6c7c8c] outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[#6c7c8c] hover:text-[#8899a8]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
        {pinned.length > 0 && (
          <>
            {pinned.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isActive={activeChat?.id === chat.id}
                onClick={() => handleChatClick(chat)}
                userAddress={wallet?.address || ''}
              />
            ))}
            {regular.length > 0 && <div className="h-px bg-[#1e2c3a] mx-4 my-1" />}
          </>
        )}
        {regular.map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            isActive={activeChat?.id === chat.id}
            onClick={() => handleChatClick(chat)}
            userAddress={wallet?.address || ''}
          />
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Search size={40} className="text-[#3a4a5a] mb-3" />
            <p className="text-[#6c7c8c] text-sm text-center">No chats found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuWalletItem({ wallet }: { wallet: { address: string; balance: string; networkName: string } | null }) {
  if (!wallet) return null;
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2aabee] to-[#1e96c8] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 7H3C2.4 7 2 7.4 2 8v13c0 .6.4 1 1 1h18c.6 0 1-.4 1-1V8c0-.6-.4-1-1-1z" stroke="white" strokeWidth="2"/>
            <path d="M16 14a1 1 0 100 2 1 1 0 000-2z" fill="white"/>
            <path d="M3 7V5a2 2 0 012-2h14a2 2 0 012 2v2" stroke="white" strokeWidth="2"/>
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm">{formatAddress(wallet.address)}</p>
          <p className="text-[#8899a8] text-xs">{wallet.balance} ETH · {wallet.networkName}</p>
        </div>
      </div>
    </div>
  );
}
