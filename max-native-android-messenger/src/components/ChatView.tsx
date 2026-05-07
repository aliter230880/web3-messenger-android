import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store';
import { Avatar } from './Avatar';
import { formatTime, generateId } from '../utils/helpers';
import { getDemoMessages, getAutoReply } from '../services/demoService';
import {
  ArrowLeft, MoreVertical, Paperclip, Smile, Send,
  Check, CheckCheck, Phone, Search, Mic, ChevronDown, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatViewProps {
  onBack: () => void;
}

export function ChatView({ onBack }: ChatViewProps) {
  const activeChatId = useAppStore((s) => s.activeChatId);
  const chats = useAppStore((s) => s.chats);
  const messages = useAppStore((s) => s.messages);
  const addMessage = useAppStore((s) => s.addMessage);
  const setMessages = useAppStore((s) => s.setMessages);
  const loadPersistedMessages = useAppStore((s) => s.loadPersistedMessages);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chat = chats.find((c) => c.id === activeChatId);
  const chatMessages = activeChatId ? messages[activeChatId] || [] : [];

  // Load messages
  useEffect(() => {
    if (!activeChatId) return;
    const existing = messages[activeChatId];
    if (existing && existing.length > 0) return;

    const persisted = loadPersistedMessages(activeChatId);
    if (persisted.length > 0) {
      setMessages(activeChatId, persisted);
      return;
    }

    const demo = getDemoMessages(activeChatId);
    setMessages(activeChatId, demo);
  }, [activeChatId]);

  // Auto scroll
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, [chatMessages.length]);

  // Track scroll position for scroll-to-bottom button
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    setShowScrollBtn(!isNearBottom);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = useCallback(() => {
    if (!input.trim() || !activeChatId) return;

    const msg = {
      id: generateId(),
      chatId: activeChatId,
      senderId: 'current',
      content: input.trim(),
      timestamp: new Date(),
      status: 'sent' as const,
      type: 'text' as const,
    };

    addMessage(activeChatId, msg);
    setInput('');
    inputRef.current?.focus();

    // Simulate typing + reply
    const chatIdCopy = activeChatId;
    setTimeout(() => setIsTyping(true), 800);
    setTimeout(() => {
      setIsTyping(false);
      const reply = {
        id: generateId(),
        chatId: chatIdCopy,
        senderId: chatIdCopy,
        content: getAutoReply(),
        timestamp: new Date(),
        status: 'delivered' as const,
        type: 'text' as const,
      };
      addMessage(chatIdCopy, reply);
    }, 1500 + Math.random() * 2000);
  }, [input, activeChatId, addMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!chat || !activeChatId) {
    return (
      <div className="flex-1 flex items-center justify-center chat-bg">
        <div className="text-center px-8">
          <div className="w-40 h-40 mx-auto mb-6 rounded-full bg-tg-blue/5 dark:bg-tg-blue/10 flex items-center justify-center">
            <div className="relative">
              <span className="text-6xl">💬</span>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-tg-blue rounded-full flex items-center justify-center">
                <Lock className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-tg-text dark:text-tg-text-dark mb-2">
            Web3Gram
          </h2>
          <p className="text-tg-secondary dark:text-tg-secondary-dark text-sm leading-relaxed max-w-[320px] mx-auto">
            Выберите чат из списка или начните новый, чтобы отправить зашифрованное сообщение
          </p>
          <div className="flex items-center justify-center gap-4 mt-6 text-xs text-tg-secondary/60 dark:text-tg-secondary-dark/60">
            <span className="flex items-center gap-1">🔒 E2E шифрование</span>
            <span className="flex items-center gap-1">⛓️ Polygon</span>
            <span className="flex items-center gap-1">💎 Web3</span>
          </div>
        </div>
      </div>
    );
  }

  const isOnline = chat.participants[0]?.isOnline;

  // Group messages by date
  const groupedMessages: { date: string; msgs: typeof chatMessages }[] = [];
  let currentDate = '';
  chatMessages.forEach((msg) => {
    const d = new Date(msg.timestamp).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long',
    });
    if (d !== currentDate) {
      currentDate = d;
      groupedMessages.push({ date: d, msgs: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].msgs.push(msg);
    }
  });

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-[#17212b] border-b border-gray-200 dark:border-gray-700/50 z-10 shadow-sm">
        <button
          onClick={onBack}
          className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-tg-blue" />
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer py-1">
          <Avatar name={chat.name} avatar={chat.avatar} size="sm" isOnline={isOnline} />
          <div className="min-w-0">
            <h2 className="font-semibold text-[15px] text-tg-text dark:text-tg-text-dark truncate leading-tight">
              {chat.name}
            </h2>
            <p className="text-xs text-tg-secondary dark:text-tg-secondary-dark leading-tight">
              {isTyping ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-tg-blue"
                >
                  печатает...
                </motion.span>
              ) : isOnline ? (
                'в сети'
              ) : (
                'был(а) недавно'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center">
          <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <Phone className="w-5 h-5 text-tg-secondary dark:text-tg-secondary-dark" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <Search className="w-5 h-5 text-tg-secondary dark:text-tg-secondary-dark" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5 text-tg-secondary dark:text-tg-secondary-dark" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto chat-bg px-2 sm:px-4 py-2"
      >
        <div className="max-w-[768px] mx-auto">
          {groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex justify-center my-3 sticky top-2 z-10">
                <span className="px-3 py-1 bg-white/70 dark:bg-[#17212b]/70 rounded-full text-xs text-tg-secondary dark:text-tg-secondary-dark backdrop-blur-md shadow-sm font-medium">
                  {group.date}
                </span>
              </div>

              {group.msgs.map((msg, idx) => {
                const isMine = msg.senderId === 'current';
                const nextMsg = group.msgs[idx + 1];
                const showTail = !nextMsg || nextMsg.senderId !== msg.senderId;
                const prevMsg = group.msgs[idx - 1];
                const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.12 }}
                    className={`flex ${isFirstInGroup ? 'mt-1.5' : 'mt-px'} ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`relative max-w-[85%] sm:max-w-[65%] lg:max-w-[55%] px-3 py-[7px] ${
                        isMine
                          ? `bg-tg-msg-out dark:bg-tg-msg-out-dark ${showTail ? 'msg-tail-out rounded-2xl rounded-br-sm' : 'rounded-2xl'}`
                          : `bg-tg-msg-in dark:bg-tg-msg-in-dark ${showTail ? 'msg-tail-in rounded-2xl rounded-bl-sm' : 'rounded-2xl'}`
                      } shadow-[0_1px_0.5px_rgba(0,0,0,0.06)]`}
                    >
                      <div className="flex items-end gap-1.5">
                        <p className={`text-[14.5px] leading-[1.35] break-words whitespace-pre-wrap ${
                          'text-tg-text dark:text-tg-text-dark'
                        }`}>
                          {msg.content}
                        </p>
                        <div className={`flex items-center gap-0.5 flex-shrink-0 self-end pb-px ${
                          isMine ? '' : ''
                        }`}>
                          <span className={`text-[11px] leading-none ${
                            isMine
                              ? 'text-[#4dc959]/80 dark:text-[#72c5e1]/60'
                              : 'text-tg-secondary/60 dark:text-tg-secondary-dark/60'
                          }`}>
                            {formatTime(msg.timestamp)}
                          </span>
                          {isMine && (
                            msg.status === 'read' ? (
                              <CheckCheck className="w-[16px] h-[16px] text-[#4dc959]/90 dark:text-[#72c5e1]/70" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck className="w-[16px] h-[16px] text-[#4dc959]/50 dark:text-[#72c5e1]/40" />
                            ) : (
                              <Check className="w-[16px] h-[16px] text-[#4dc959]/50 dark:text-[#72c5e1]/40" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start mt-1"
            >
              <div className="bg-tg-msg-in dark:bg-tg-msg-in-dark px-4 py-3 rounded-2xl rounded-bl-sm msg-tail-in shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-tg-secondary/60 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-tg-secondary/60 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-tg-secondary/60 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToBottom}
            className="absolute bottom-20 right-6 w-10 h-10 bg-white dark:bg-[#17212b] rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700 z-10"
          >
            <ChevronDown className="w-5 h-5 text-tg-secondary dark:text-tg-secondary-dark" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="bg-white dark:bg-[#17212b] border-t border-gray-200 dark:border-gray-700/50 px-2 py-1.5">
        <div className="max-w-[768px] mx-auto flex items-end gap-1">
          <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0 mb-0.5">
            <Paperclip className="w-6 h-6 text-tg-secondary dark:text-tg-secondary-dark rotate-[-45deg]" />
          </button>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Сообщение"
              className="w-full px-4 py-2.5 bg-transparent text-[15px] text-tg-text dark:text-tg-text-dark placeholder-tg-secondary/60 dark:placeholder-tg-secondary-dark/60 outline-none"
            />
          </div>

          <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0 mb-0.5">
            <Smile className="w-6 h-6 text-tg-secondary dark:text-tg-secondary-dark" />
          </button>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={input.trim() ? handleSend : undefined}
            className={`p-2.5 rounded-full transition-all flex-shrink-0 mb-0.5 ${
              input.trim()
                ? 'text-tg-blue hover:bg-tg-blue/10'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {input.trim() ? (
              <Send className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6 text-tg-secondary dark:text-tg-secondary-dark" />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
