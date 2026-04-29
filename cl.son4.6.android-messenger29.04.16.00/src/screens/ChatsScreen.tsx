import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { formatChatTime } from '../utils/web3';

type Tab = 'all' | 'personal';

export default function ChatsScreen() {
  const { chats, contacts, selectChat, setScreen, searchQuery, setSearchQuery, username, userAddress, logout, avatarId, showToast } = useApp();
  const [activeTab] = useState<Tab>('all');
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const filtered = chats.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q);
  });

  const sortedChats = [...filtered].sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header - Telegram style */}
      <div className="bg-[#2481cc] text-white px-4 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </button>
            <span className="text-xl font-semibold">AliTerra</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/>
                <path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
            <button
              onClick={() => setScreen('newChat')}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M12 5v14M5 12h14"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="mb-2">
            <div className="flex items-center bg-white/20 rounded-xl px-3 py-2 gap-2">
              <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/>
                <path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="flex-1 bg-transparent text-white placeholder-white/60 text-sm outline-none"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setShowSearch(false); }} className="text-white/80">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: 'all', label: 'Все чаты' },
            { key: 'personal', label: 'Личные' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeTab === tab.key ? 'bg-white/30 text-white' : 'text-white/70'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Side Menu Overlay */}
      {showMenu && (
        <div className="absolute inset-0 z-50 flex">
          <div className="w-72 bg-white h-full shadow-2xl flex flex-col" style={{ borderRadius: '0 0 24px 0' }}>
            {/* Menu header */}
            <div className="bg-[#2481cc] px-5 pt-14 pb-5">
              <div className="flex items-center gap-3 mb-3">
                <Avatar address={userAddress} name={username} size="lg" />
                <div>
                  <p className="text-white font-semibold">{username}</p>
                  <p className="text-white/70 text-xs">{userAddress.slice(0, 6) + '...' + userAddress.slice(-4)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400"/>
                <span className="text-white/80 text-xs">В сети</span>
              </div>
            </div>

            {/* Menu items */}
            <div className="flex-1 py-2">
              {[
                { icon: '👤', label: 'Мой профиль', action: () => { setScreen('profile'); setShowMenu(false); } },
                { icon: '👥', label: 'Контакты', action: () => { setScreen('contacts'); setShowMenu(false); } },
                { icon: '💬', label: 'Новый чат', action: () => { setScreen('newChat'); setShowMenu(false); } },
                { icon: '⚙️', label: 'Настройки', action: () => { setScreen('settings'); setShowMenu(false); } },
                { icon: '🌐', label: 'chat.aliterra.space', action: () => { window.open('https://chat.aliterra.space', '_blank'); setShowMenu(false); } },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 active:bg-gray-100 text-left"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-gray-800 font-medium">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-gray-100 py-2">
              <button
                onClick={() => { logout(); setShowMenu(false); }}
                className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-red-50 text-left"
              >
                <span className="text-xl">🚪</span>
                <span className="text-red-500 font-medium">Выйти</span>
              </button>
            </div>
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setShowMenu(false)}/>
        </div>
      )}

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {sortedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <span className="text-4xl">💬</span>
            </div>
            <h3 className="text-gray-800 font-semibold text-lg">Нет чатов</h3>
            <p className="text-gray-500 text-sm mt-2">
              {searchQuery ? 'Ничего не найдено' : 'Добавьте контакт чтобы начать общение'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setScreen('newChat')}
                className="mt-4 px-6 py-3 bg-[#2481cc] text-white rounded-xl font-medium text-sm"
              >
                Написать первым
              </button>
            )}
          </div>
        ) : (
          sortedChats.map((chat, index) => (
            <ChatItem
              key={chat.address}
              chat={chat}
              isLast={index === sortedChats.length - 1}
              onSelect={() => selectChat(chat.address)}
            />
          ))
        )}
      </div>

      {/* FAB - New chat button */}
      <button
        onClick={() => setScreen('newChat')}
        className="absolute bottom-6 right-4 w-14 h-14 bg-[#2481cc] rounded-full flex items-center justify-center shadow-xl shadow-blue-300/50 active:scale-95 transition-transform z-10"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      </button>
    </div>
  );
}

function ChatItem({ chat, isLast, onSelect }: {
  chat: any;
  isLast: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar address={chat.address} name={chat.name} size="md" />
        {chat.online && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"/>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-semibold text-gray-900 text-[15px] truncate">{chat.name}</span>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            {chat.lastTime ? (
              <span className="text-xs text-gray-400">{formatChatTime(chat.lastTime)}</span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 truncate flex-1">
            {chat.lastMessage || (
              <span className="text-[#2481cc] text-xs">Нет сообщений</span>
            )}
          </span>
          {(chat.unread ?? 0) > 0 && (
            <div className="ml-2 min-w-[20px] h-5 bg-[#2481cc] rounded-full flex items-center justify-center px-1.5">
              <span className="text-white text-xs font-bold">{chat.unread}</span>
            </div>
          )}
        </div>
      </div>

      {!isLast && <div className="absolute left-[72px] right-0 bottom-0 h-px bg-gray-100"/>}
    </button>
  );
}
