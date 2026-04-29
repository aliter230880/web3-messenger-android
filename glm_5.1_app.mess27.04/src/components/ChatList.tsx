import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Chat } from '../types';
import { Pin, Volume2 } from 'lucide-react';
import { cn } from '../utils/cn';

interface ChatListProps {
  chats: Chat[];
  selectedChatId?: string;
  onSelectChat: (chat: Chat) => void;
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'вчера';
  return format(date, 'd MMM', { locale: ru });
};

const getLastMessage = (chat: Chat) => {
  return chat.messages[chat.messages.length - 1];
};

export const ChatList: React.FC<ChatListProps> = ({ chats, selectedChatId, onSelectChat }) => {
  const sortedChats = [...chats].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.lastActivity - a.lastActivity;
  });

  return (
    <div className="flex-1 overflow-y-auto">
      {sortedChats.map((chat) => {
        const lastMsg = getLastMessage(chat);
        const isActive = selectedChatId === chat.id;

        return (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat)}
            className={cn(
              'flex w-full items-center gap-3 px-3 py-[9px] transition-colors text-left',
              isActive
                ? 'bg-[#3390ec] text-white'
                : 'hover:bg-[#f4f4f5] active:bg-[#e8e8e9] dark:hover:bg-[#2c3744] dark:active:bg-[#333f4d]'
            )}
          >
            {/* Avatar */}
            <div className="relative h-[54px] w-[54px] flex-shrink-0">
              <img
                src={chat.user.avatar}
                alt={chat.user.name}
                className="h-full w-full rounded-full bg-zinc-200 dark:bg-zinc-700 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${chat.user.name}`;
                }}
              />
              {chat.user.status === 'online' && !isActive && (
                <div className="absolute bottom-[2px] right-[2px] h-[14px] w-[14px] rounded-full border-[2.5px] border-white bg-[#4dcd5e] dark:border-[#17212b]" />
              )}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className={cn(
                    'truncate font-semibold text-[15px] leading-tight',
                    isActive ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'
                  )}>
                    {chat.user.name}
                  </span>
                  {chat.isPinned && !isActive && (
                    <Pin className="h-3 w-3 text-zinc-400 flex-shrink-0 rotate-45" />
                  )}
                  {chat.isMuted && !isActive && (
                    <Volume2 className="h-3 w-3 text-zinc-400 flex-shrink-0" />
                  )}
                </div>
                <span className={cn(
                  'text-[12px] flex-shrink-0 leading-tight',
                  isActive ? 'text-white/70' : chat.unreadCount > 0 ? 'text-[#3390ec]' : 'text-zinc-400'
                )}>
                  {lastMsg ? formatTime(lastMsg.timestamp) : ''}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className={cn(
                  'truncate text-[14px] leading-tight',
                  isActive ? 'text-white/85' : 'text-zinc-500 dark:text-zinc-400'
                )}>
                  {lastMsg?.isMe && (
                    <span className={cn(
                      isActive ? 'text-white/90' : 'text-[#4fae4e] dark:text-[#a1c6e7]'
                    )}>
                      {lastMsg.status === 'read' ? '✓✓ ' : lastMsg.status === 'delivered' ? '✓✓ ' : '✓ '}
                    </span>
                  )}
                  {chat.user.status === 'typing' && !isActive ? (
                    <span className="text-[#3390ec]">печатает...</span>
                  ) : (
                    lastMsg?.text || ''
                  )}
                </span>
                {chat.unreadCount > 0 && !isActive && (
                  <span className={cn(
                    'flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-[6px] text-[12px] font-bold flex-shrink-0',
                    chat.isMuted ? 'bg-zinc-300 text-zinc-600 dark:bg-zinc-600 dark:text-zinc-400' : 'bg-[#3390ec] text-white'
                  )}>
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
