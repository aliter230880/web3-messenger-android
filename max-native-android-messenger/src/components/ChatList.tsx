import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import { Avatar } from './Avatar';
import { formatChatDate } from '../utils/helpers';
import { Pin, VolumeX, Check, CheckCheck, Trash2, Volume2, PinOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatListProps {
  onChatSelect: (chatId: string) => void;
}

export function ChatList({ onChatSelect }: ChatListProps) {
  const chats = useAppStore((s) => s.chats);
  const activeChatId = useAppStore((s) => s.activeChatId);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const wallet = useAppStore((s) => s.wallet);
  const pinChat = useAppStore((s) => s.pinChat);
  const muteChat = useAppStore((s) => s.muteChat);
  const deleteChat = useAppStore((s) => s.deleteChat);

  const [contextMenu, setContextMenu] = useState<{
    chatId: string;
    x: number;
    y: number;
  } | null>(null);
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef(false);

  // Long press handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent, chatId: string) => {
    longPressTriggered.current = false;
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setContextMenu({ chatId, x: touch.clientX, y: touch.clientY });
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Context menu (right click)
  const handleContextMenu = useCallback((e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    setContextMenu({ chatId, x: e.clientX, y: e.clientY });
  }, []);

  const handleClick = useCallback((chatId: string) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    onChatSelect(chatId);
  }, [onChatSelect]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleDelete = useCallback((chatId: string) => {
    deleteChat(chatId);
    setContextMenu(null);
  }, [deleteChat]);

  const handlePin = useCallback((chatId: string) => {
    pinChat(chatId);
    setContextMenu(null);
  }, [pinChat]);

  const handleMute = useCallback((chatId: string) => {
    muteChat(chatId);
    setContextMenu(null);
  }, [muteChat]);

  const filtered = searchQuery
    ? chats.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chats;

  const sorted = [...filtered].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  const contextChat = contextMenu ? chats.find(c => c.id === contextMenu.chatId) : null;

  if (!wallet.isConnected && sorted.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div>
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Web3Gram</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            Децентрализованный мессенджер<br/>с E2E шифрованием
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-3">
            Подключите кошелёк для начала
          </p>
        </div>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div>
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {searchQuery ? 'Ничего не найдено' : 'Нет чатов'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {sorted.map((chat) => {
          const isActive = chat.id === activeChatId;
          const isOnline = chat.participants[0]?.isOnline;
          const lastMsg = chat.lastMessage;
          const isMine = lastMsg?.senderId === 'current';

          return (
            <div
              key={chat.id}
              onClick={() => handleClick(chat.id)}
              onContextMenu={(e) => handleContextMenu(e, chat.id)}
              onTouchStart={(e) => handleTouchStart(e, chat.id)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
              className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors select-none ${
                isActive
                  ? 'bg-tg-blue'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
              }`}
            >
              <Avatar name={chat.name} avatar={chat.avatar} isOnline={isOnline} />

              <div className="flex-1 min-w-0 py-0.5">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1 min-w-0">
                    {chat.isPinned && (
                      <Pin className={`w-3 h-3 flex-shrink-0 rotate-45 ${isActive ? 'text-white/70' : 'text-gray-400'}`} />
                    )}
                    <span className={`font-semibold text-[15px] truncate ${
                      isActive ? 'text-white' : 'text-gray-900 dark:text-white'
                    }`}>
                      {chat.name}
                    </span>
                  </div>
                  {lastMsg && (
                    <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
                      {isMine && (
                        lastMsg.status === 'read' ? (
                          <CheckCheck className={`w-4 h-4 ${isActive ? 'text-white/70' : 'text-tg-blue'}`} />
                        ) : (
                          <Check className={`w-4 h-4 ${isActive ? 'text-white/70' : 'text-gray-400'}`} />
                        )
                      )}
                      <span className={`text-xs ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                        {formatChatDate(lastMsg.timestamp)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <p className={`text-sm truncate flex-1 ${
                    isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {isMine && <span className={isActive ? 'text-white/60' : 'text-tg-blue'}>Вы: </span>}
                    {lastMsg?.content || 'Нет сообщений'}
                  </p>

                  <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                    {chat.isMuted && (
                      <VolumeX className={`w-4 h-4 ${isActive ? 'text-white/50' : 'text-gray-400'}`} />
                    )}
                    {chat.unreadCount > 0 && (
                      <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium flex items-center justify-center ${
                        chat.isMuted
                          ? 'bg-gray-400 text-white'
                          : isActive
                            ? 'bg-white text-tg-blue'
                            : 'bg-tg-green text-white'
                      }`}>
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && contextChat && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              onClick={closeContextMenu}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="fixed z-50 bg-white dark:bg-[#17212b] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[180px]"
              style={{
                left: Math.min(contextMenu.x, window.innerWidth - 200),
                top: Math.min(contextMenu.y, window.innerHeight - 200),
              }}
            >
              <button
                onClick={() => handlePin(contextMenu.chatId)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {contextChat.isPinned ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
                {contextChat.isPinned ? 'Открепить' : 'Закрепить'}
              </button>
              <button
                onClick={() => handleMute(contextMenu.chatId)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {contextChat.isMuted ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                {contextChat.isMuted ? 'Включить звук' : 'Без звука'}
              </button>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <button
                onClick={() => handleDelete(contextMenu.chatId)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-5 h-5" />
                Удалить чат
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
