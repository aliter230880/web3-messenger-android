import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Phone,
  Search,
  MoreVertical,
  Smile,
  Paperclip,
  Send,
  Mic,
  Check,
  CheckCheck,
} from 'lucide-react';
import { format, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Chat, Message } from '../types';
import { cn } from '../utils/cn';


interface ChatWindowProps {
  chat: Chat;
  onBack: () => void;
  onSendMessage: (chatId: string, text: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onBack, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.messages.length]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [chat.id]);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    onSendMessage(chat.id, inputText.trim());
    setInputText('');
  }, [inputText, chat.id, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMsgTime = (ts: number) => format(new Date(ts), 'HH:mm');
  const formatDateSep = (ts: number) => {
    const d = new Date(ts);
    if (isToday(d)) return 'Сегодня';
    return format(d, 'd MMMM yyyy', { locale: ru });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let lastDate = '';
  for (const msg of chat.messages) {
    const dateStr = formatDateSep(msg.timestamp);
    if (dateStr !== lastDate) {
      groupedMessages.push({ date: dateStr, messages: [msg] });
      lastDate = dateStr;
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  const StatusIcon = ({ status }: { status: Message['status'] }) => {
    if (status === 'sent') return <Check className="h-3.5 w-3.5 text-zinc-400" />;
    if (status === 'delivered') return <CheckCheck className="h-3.5 w-3.5 text-zinc-400" />;
    return <CheckCheck className="h-3.5 w-3.5 text-[#4fae4e]" />;
  };

  const isTyping = chat.user.status === 'typing';

  return (
    <div className="flex h-full flex-col bg-[#8BABD8]">
      {/* Header */}
      <div className="flex h-[56px] items-center justify-between bg-white px-4 dark:bg-[#17212b] dark:text-white flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center justify-center md:hidden -ml-1 mr-1 h-10 w-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-10 w-10 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700 flex-shrink-0">
            <img src={chat.user.avatar} alt={chat.user.name} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[15px] text-zinc-900 dark:text-zinc-100 truncate leading-tight">
              {chat.user.name}
            </h3>
            <span className={cn(
              'text-[13px] leading-tight',
              isTyping ? 'text-[#3390ec]' : 'text-zinc-500 dark:text-zinc-400'
            )}>
              {isTyping ? 'печатает...' : chat.user.id === 'saved' ? '' : chat.user.status === 'online' ? 'в сети' : `был(а) недавно`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 flex-shrink-0">
          <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <Search className="h-5 w-5" />
          </button>
          <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <Phone className="h-5 w-5" />
          </button>
          <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2"
        style={{
          backgroundImage: 'linear-gradient(rgba(139,171,216,.5), rgba(139,171,216,.5)), url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
          backgroundSize: 'auto',
        }}
      >
        <div className="mx-auto max-w-[728px]">
          {groupedMessages.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex justify-center my-3">
                <span className="rounded-full bg-black/20 backdrop-blur-sm px-3 py-1 text-[13px] font-medium text-white shadow-sm">
                  {group.date}
                </span>
              </div>

              {group.messages.map((message, idx) => {
                const showTail = idx === group.messages.length - 1 ||
                  group.messages[idx + 1]?.isMe !== message.isMe ||
                  (group.messages[idx + 1]?.timestamp - message.timestamp > 60000);

                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex mb-[2px]',
                      message.isMe ? 'justify-end' : 'justify-start',
                      showTail && 'mb-1.5'
                    )}
                  >
                    <div
                      className={cn(
                        'relative max-w-[85%] md:max-w-[65%] shadow-sm',
                        message.isMe
                          ? cn(
                              'bg-[#effdde] dark:bg-[#2b5278]',
                              showTail ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl'
                            )
                          : cn(
                              'bg-white dark:bg-[#182533]',
                              showTail ? 'rounded-2xl rounded-bl-sm' : 'rounded-2xl'
                            )
                      )}
                    >
                      <div className="px-[10px] py-[6px]">
                        <span className={cn(
                          'text-[15px] leading-[21px] whitespace-pre-wrap break-words',
                          message.isMe ? 'text-[#1a1a1a] dark:text-white' : 'text-[#1a1a1a] dark:text-white'
                        )}>
                          {message.text}
                        </span>
                        <span className="inline-flex items-center gap-0.5 float-right mt-[4px] ml-[10px] relative top-[4px]">
                          <span className={cn(
                            'text-[11px]',
                            message.isMe ? 'text-[#6dbe6d] dark:text-[#a1c6e7]' : 'text-zinc-400'
                          )}>
                            {formatMsgTime(message.timestamp)}
                          </span>
                          {message.isMe && <StatusIcon status={message.status} />}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start mb-1.5">
              <div className="rounded-2xl rounded-bl-sm bg-white dark:bg-[#182533] px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="bg-white dark:bg-[#17212b] px-2 py-2 flex-shrink-0">
        <div className="mx-auto max-w-[728px] flex items-end gap-1">
          <button className="h-10 w-10 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0">
            <Smile className="h-6 w-6" />
          </button>
          <button className="h-10 w-10 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0">
            <Paperclip className="h-6 w-6" />
          </button>
          <div className="flex-1 min-w-0">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Сообщение"
              className="w-full rounded-2xl bg-transparent py-[10px] px-3 text-[15px] focus:outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>
          <button
            onClick={handleSend}
            className={cn(
              'h-10 w-10 flex items-center justify-center rounded-full transition-all flex-shrink-0',
              inputText.trim()
                ? 'text-[#3390ec] hover:bg-blue-50 dark:hover:bg-blue-900/20 scale-100'
                : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            )}
          >
            {inputText.trim() ? <Send className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>
        </div>
      </div>
    </div>
  );
};
