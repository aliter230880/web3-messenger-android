import { useState } from 'react';
import { Pin, BellOff, Trash2, Check, CheckCheck } from 'lucide-react';
import { useAppStore } from '../store';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ChatListProps {
  onChatSelect: (chatId: string) => void;
}

export function ChatList({ onChatSelect }: ChatListProps) {
  const { chats, pinChat, muteChat, deleteChat } = useAppStore();
  const [contextMenu, setContextMenu] = useState<{ chatId: string; x: number; y: number } | null>(null);

  const filteredChats = chats
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

  const handleContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    setContextMenu({ chatId, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const getAvatarGradient = (name: string) => {
    const colors = [
      'avatar-gradient-1',
      'avatar-gradient-2',
      'avatar-gradient-3',
      'avatar-gradient-4',
      'avatar-gradient-5',
      'avatar-gradient-6',
      'avatar-gradient-7',
      'avatar-gradient-8',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const MessageStatus = ({ status }: { status: string }) => {
    if (status === 'read') {
      return <CheckCheck className="w-4 h-4 text-[#3390ec]" />;
    }
    if (status === 'delivered') {
      return <CheckCheck className="w-4 h-4 text-gray-400" />;
    }
    if (status === 'sent') {
      return <Check className="w-4 h-4 text-gray-400" />;
    }
    return null;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {filteredChats.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
          <svg className="w-16 h-16 mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p className="text-sm">Нет чатов</p>
          <p className="text-xs mt-2">Нажмите + чтобы создать чат</p>
        </div>
      ) : (
        filteredChats.map((chat, index) => (
          <div key={chat.id}>
            <div
              onClick={() => onChatSelect(chat.id)}
              onContextMenu={(e) => handleContextMenu(e, chat.id)}
              className="flex items-center gap-3 p-2.5 mx-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors relative group"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className={`w-13 h-13 rounded-full ${getAvatarGradient(chat.name)} flex items-center justify-center text-white font-semibold text-base`}>
                  {chat.avatar || chat.name.slice(0, 2).toUpperCase()}
                </div>
                {chat.type === 'private' && chat.participants[0]?.isOnline && (
                  <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-[#00c73e] border-2 border-white rounded-full" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {chat.name}
                    </h3>
                    {chat.isPinned && <Pin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 rotate-45" />}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {chat.isMuted && <BellOff className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {chat.lastMessage && formatDistanceToNow(chat.lastMessage.timestamp, { locale: ru, addSuffix: false })}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    {chat.lastMessage?.senderId === 'current' && (
                      <span className="flex-shrink-0">
                        <MessageStatus status={chat.lastMessage.status} />
                      </span>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex-1">
                      {chat.lastMessage?.content || 'Нет сообщений'}
                    </p>
                  </div>
                  
                  {chat.unreadCount > 0 && (
                    <div className={`flex-shrink-0 min-w-[22px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-semibold ${
                      chat.isPinned ? 'bg-white text-gray-600 border border-gray-300' : 'bg-[#3390ec] text-white'
                    }`}>
                      {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                    </div>
                  )}
                </div>
              </div>

              {/* Кнопка удаления для мобильных */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Удалить чат с "${chat.name}"?`)) {
                    deleteChat(chat.id);
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="Удалить чат"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
            
            {/* Разделитель */}
            {index < filteredChats.length - 1 && (
              <div className="mx-2 border-b border-gray-100 dark:border-gray-800" />
            )}
          </div>
        ))
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeContextMenu} />
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl py-2 min-w-[200px] border border-gray-200 dark:border-gray-700"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 220),
              top: Math.min(contextMenu.y, window.innerHeight - 170),
            }}
          >
            <button
              onClick={() => {
                pinChat(contextMenu.chatId);
                closeContextMenu();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
            >
              <Pin className="w-4 h-4 rotate-45" />
              <span className="text-sm">
                {useAppStore.getState().chats.find(c => c.id === contextMenu.chatId)?.isPinned ? 'Открепить' : 'Закрепить'}
              </span>
            </button>
            <button
              onClick={() => {
                muteChat(contextMenu.chatId);
                closeContextMenu();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
            >
              <BellOff className="w-4 h-4" />
              <span className="text-sm">
                {useAppStore.getState().chats.find(c => c.id === contextMenu.chatId)?.isMuted ? 'Включить уведомления' : 'Выключить уведомления'}
              </span>
            </button>
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-1.5" />
            <button
              onClick={() => {
                deleteChat(contextMenu.chatId);
                closeContextMenu();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">Удалить чат</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
