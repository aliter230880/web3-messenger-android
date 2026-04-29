import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Paperclip, Send, Smile, ArrowLeft, Phone, Search } from 'lucide-react';
import { Chat, Message } from '../types';
import { cn } from '../utils/cn';
import { format } from 'date-fns';
import { apiService } from '../services/api';

interface ChatWindowProps {
  chat: Chat;
  onBack: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    chat.lastMessage,
    {
      id: 'm-initial-1',
      text: 'Hello! How can I help you today?',
      senderId: chat.user.id,
      timestamp: new Date(chat.lastMessage.timestamp.getTime() - 3600000),
      isMe: false,
    },
  ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inputText.length > 0 && !isTyping) {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    }
  }, [inputText]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      senderId: 'me',
      timestamp: new Date(),
      isMe: true,
    };

    setMessages([...messages, newMessage]);
    setInputText('');
    
    // Call API
    apiService.sendMessage(chat.id, inputText).catch(err => {
      console.error("Failed to send to backend", err);
    });
  };

  return (
    <div className="flex h-full flex-col bg-[#e5ddd5] dark:bg-zinc-900">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b bg-white px-4 py-2 dark:bg-zinc-800 dark:border-zinc-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-full p-2 hover:bg-zinc-100 md:hidden dark:hover:bg-zinc-700"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="h-10 w-10 overflow-hidden rounded-full bg-zinc-200">
            <img src={chat.user.avatar} alt={chat.user.name} className="h-full w-full object-cover" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{chat.user.name}</h3>
            <span className="text-xs text-[#50a2e9] dark:text-[#50a2e9] capitalize">
              {isTyping ? 'typing...' : chat.user.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-zinc-500">
          <Search className="h-5 w-5 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300" />
          <Phone className="h-5 w-5 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300" />
          <MoreVertical className="h-5 w-5 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300" />
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#8BABD8] dark:bg-zinc-950"
        style={{ 
          backgroundImage: 'url("https://telegram.org/img/bg_chat.png")', 
          backgroundRepeat: 'repeat',
          backgroundBlendMode: 'overlay',
          backgroundColor: '#8BABD8'
        }}
      >
        <div className="mx-auto mb-4 w-fit rounded-full bg-black/20 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          {format(new Date(), 'MMMM d')}
        </div>
        
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(
              "flex w-full",
              message.isMe ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-1.5 shadow-sm relative min-w-[60px]",
                message.isMe 
                  ? "bg-[#effdde] text-[#1a1a1a] dark:bg-[#2b5278] dark:text-white rounded-br-sm" 
                  : "bg-white text-[#1a1a1a] dark:bg-[#182533] dark:text-white rounded-bl-sm"
              )}
            >
              <p className="text-[15px] leading-tight pb-1 pr-10">{message.text}</p>
              <div className={cn(
                "text-[11px] absolute bottom-1 right-2 opacity-60 flex items-center gap-1",
                message.isMe ? "text-[#4fae4e] dark:text-[#a1c6e7]" : "text-zinc-500 dark:text-zinc-400"
              )}>
                {format(message.timestamp, 'HH:mm')}
                {message.isMe && (
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" />
                    <path d="M5 13l4 4L19 7" className="translate-x-1" />
                  </svg>
                )}
              </div>
              
              {/* Fake Reaction */}
              {index === 0 && !message.isMe && (
                <div className="absolute -bottom-2 -right-1 flex h-5 items-center gap-0.5 rounded-full border border-zinc-200 bg-white px-1 shadow-sm dark:border-zinc-700 dark:bg-[#182533]">
                  <span className="text-[10px]">👍</span>
                  <span className="text-[9px] font-medium dark:text-white">1</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="bg-white px-4 py-3 dark:bg-zinc-800 border-t dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <button className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            <Smile className="h-6 w-6" />
          </button>
          <button className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            <Paperclip className="h-6 w-6" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Write a message..."
            className="flex-1 rounded-full bg-zinc-100 px-4 py-2 text-sm focus:outline-none dark:bg-zinc-700 dark:text-zinc-100"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className={cn(
              "rounded-full p-2 transition-colors",
              inputText.trim() ? "bg-blue-500 text-white" : "text-zinc-400"
            )}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
