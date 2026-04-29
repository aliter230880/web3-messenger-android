import React from 'react';
import { format } from 'date-fns';
import { Chat } from '../types';
import { cn } from '../utils/cn';

interface ChatListProps {
  chats: Chat[];
  selectedChatId?: string;
  onSelectChat: (chat: Chat) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ chats, selectedChatId, onSelectChat }) => {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
      {chats.map((chat) => (
        <button
          key={chat.id}
          onClick={() => onSelectChat(chat)}
          className={cn(
            "flex w-full items-center gap-3 px-3 py-2.5 transition-colors",
            selectedChatId === chat.id 
              ? "bg-[#3390ec] text-white" 
              : "hover:bg-zinc-100 dark:hover:bg-[#2c3744]"
          )}
        >
          <div className="relative h-14 w-14 flex-shrink-0">
            <img
              src={chat.user.avatar}
              alt={chat.user.name}
              className="h-full w-full rounded-full bg-zinc-200 dark:bg-zinc-700 object-cover"
            />
            {chat.user.status === 'online' && (
              <div className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#40a7e3] dark:border-[#17212b]" />
            )}
          </div>
          <div className="flex flex-1 flex-col items-start overflow-hidden py-1">
            <div className="flex w-full items-center justify-between">
              <span className={cn(
                "truncate font-medium text-[16px]",
                selectedChatId === chat.id ? "text-white" : "text-zinc-900 dark:text-zinc-100"
              )}>
                {chat.user.name}
              </span>
              <span className={cn(
                "text-[12px]",
                selectedChatId === chat.id ? "text-white/80" : "text-zinc-400"
              )}>
                {format(chat.lastMessage.timestamp, 'HH:mm')}
              </span>
            </div>
            <div className="flex w-full items-center justify-between">
              <span className={cn(
                "truncate text-[14px]",
                selectedChatId === chat.id ? "text-white/90" : "text-zinc-500 dark:text-zinc-400"
              )}>
                {chat.lastMessage.isMe && (
                  <span className={cn(
                    "mr-1",
                    selectedChatId === chat.id ? "text-white" : "text-[#4fae4e] dark:text-[#a1c6e7]"
                  )}>
                    You:
                  </span>
                )}
                {chat.lastMessage.text}
              </span>
              {chat.unreadCount > 0 && selectedChatId !== chat.id && (
                <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#40a7e3] px-1.5 text-[11px] font-bold text-white shadow-sm">
                  {chat.unreadCount}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};
