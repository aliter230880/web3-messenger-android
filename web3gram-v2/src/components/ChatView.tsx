import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, Paperclip, Mic, Smile, Phone, Video, MoreVertical } from 'lucide-react';
import { useAppStore } from '../store';
import { useWeb3Messenger } from '../hooks/useWeb3Messenger';
import { xmtpService } from '../services/xmtpService';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { MessageStatus } from './MessageStatus';
import { LoadingSpinner } from './LoadingSpinner';
import type { Message } from '../types';

interface ChatViewProps {
  chatId: string;
  onBack: () => void;
}

const EMOJIS = ['😀','😂','😍','🥰','😎','🤔','👍','👎','❤️','🔥','🎉','✨','🚀','💎','💰','📈','👋','🙏','💪','🤝','👀','🎯','✅','❌','⭐','🌟','💯','🙌','🤗','😴'];

const AVATAR_GRADIENTS = [
  'avatar-gradient-1','avatar-gradient-2','avatar-gradient-3','avatar-gradient-4',
  'avatar-gradient-5','avatar-gradient-6','avatar-gradient-7','avatar-gradient-8',
];

function getAvatarGradient(name: string) {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

export function ChatView({ chatId, onBack }: ChatViewProps) {
  const { chats, messages, addMessage, updateMessageStatus, currentUser, setMessages, loadPersistedMessages } = useAppStore();
  const { sendMessage, loadMessages, isConnected, xmtpReady } = useWeb3Messenger();

  const [inputValue, setInputValue] = useState('');
  const [showEmoji,  setShowEmoji]  = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [isSending,  setIsSending]  = useState(false);
  const [xmtpWarn,   setXmtpWarn]  = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const streamRef      = useRef<any>(null);

  const chat        = chats.find((c) => c.id === chatId);
  const chatMessages = messages[chatId] || [];
  const peerAddress  = chat?.participants[0]?.walletAddress || chatId;

  // ── Scroll to bottom on new messages ──────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  // ── Step 1: Load from localStorage cache instantly (no network needed) ────
  useEffect(() => {
    if (!chat) return;
    const cached = loadPersistedMessages(chatId);
    if (cached.length > 0 && !messages[chatId]?.length) {
      setMessages(chatId, cached);
    }
  }, [chatId]);

  // ── Step 2: Load history from XMTP (runs when chatId opens OR xmtpReady flips) ──
  useEffect(() => {
    if (!chat || !isConnected || !xmtpReady || !xmtpService.isInitialized()) return;

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        await loadMessages(peerAddress, chatId);
      } catch (e) {
        console.warn('loadMessages error:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [chatId, xmtpReady]);

  // ── Step 3: Subscribe to real-time messages for THIS chat ─────────────────
  // Re-runs when xmtpReady becomes true (fires after background XMTP init)
  useEffect(() => {
    if (!isConnected || !xmtpReady || !xmtpService.isInitialized()) return;

    // Close previous stream
    if (streamRef.current) {
      try { streamRef.current.return?.(); } catch (_) {}
      streamRef.current = null;
    }

    (async () => {
      try {
        streamRef.current = await xmtpService.subscribeToMessages(
          peerAddress,
          (msg: any) => {
            const rawContent = typeof msg.content === 'string' ? msg.content : '[media]';
            const content    = rawContent.startsWith('v1:') ? '🔒 зашифровано' : rawContent;
            const newMsg: Message = {
              id: msg.id,
              chatId,
              senderId: msg.senderAddress.toLowerCase(),
              content,
              timestamp: msg.sent,
              status: 'delivered',
              type: 'text',
            };
            addMessage(chatId, newMsg);
          }
        );
      } catch (e) {
        console.warn('chat subscription error:', e);
      }
    })();

    return () => {
      if (streamRef.current) {
        try { streamRef.current.return?.(); } catch (_) {}
        streamRef.current = null;
      }
    };
  }, [chatId, xmtpReady]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isSending) return;

    const text   = inputValue.trim();
    const tempId = `temp-${Date.now()}`;

    const optimistic: Message = {
      id: tempId,
      chatId,
      senderId: currentUser?.id || 'current',
      content: text,
      timestamp: new Date(),
      status: 'sending',
      type: 'text',
    };

    addMessage(chatId, optimistic);
    setInputValue('');
    setShowEmoji(false);
    setIsSending(true);

    if (!xmtpService.isInitialized()) {
      // XMTP unavailable — save locally only, warn user
      updateMessageStatus(chatId, tempId, 'sent');
      setIsSending(false);
      setXmtpWarn(true);
      setTimeout(() => setXmtpWarn(false), 4000);
      return;
    }

    try {
      // sendMessage goes through XMTP — E2E encrypted, reaches recipient
      const sentId = await sendMessage(peerAddress, text);

      // Replace temp ID with real XMTP message ID
      const store   = useAppStore.getState();
      const current = store.messages[chatId] || [];
      setMessages(chatId, current.map((m) =>
        m.id === tempId ? { ...m, id: sentId, status: 'sent' } : m
      ));
    } catch (e: any) {
      console.error('❌ send error:', e);
      updateMessageStatus(chatId, tempId, 'sent');
    } finally {
      setIsSending(false);
    }
  }, [inputValue, isSending, chatId, peerAddress, xmtpReady, sendMessage, currentUser, addMessage, updateMessageStatus, setMessages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji: string) => {
    setInputValue((prev) => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  if (!chat) return null;

  const myAddr = currentUser?.walletAddress?.toLowerCase() || currentUser?.id?.toLowerCase() || 'current';

  return (
    <div className="flex flex-col h-full chat-bg">
      {/* Header */}
      <div className="flex items-center gap-3 p-2.5 bg-white border-b border-gray-300 z-10">
        <button
          onClick={onBack}
          className="p-2.5 hover:bg-gray-100 rounded-full transition-colors lg:hidden"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex items-center gap-3 flex-1 cursor-pointer">
          <div className={`w-10 h-10 rounded-full ${getAvatarGradient(chat.name)} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
            {chat.avatar || chat.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{chat.name}</h3>
            <p className="text-xs text-gray-500 truncate">
              {isConnected ? (
                xmtpReady
                  ? (chat.participants[0]?.isOnline ? 'в сети' : peerAddress)
                  : '⏳ XMTP подключается...'
              ) : (
                'Подключи кошелёк для отправки сообщений'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-2.5 hover:bg-gray-100 rounded-full transition-colors">
            <Phone className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 rounded-full transition-colors">
            <Video className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* XMTP not-ready warning banner */}
      {isConnected && !xmtpReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          XMTP подключается в фоне... История и отправка будут доступны через несколько секунд
        </div>
      )}

      {/* Send-blocked warning */}
      {xmtpWarn && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700">
          ⚠️ XMTP ещё не готов — подождите несколько секунд и попробуйте снова
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2.5 md:p-4 space-y-1 min-w-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="md" text="Загрузка сообщений..." />
          </div>
        ) : chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Нет сообщений</p>
              <p className="text-xs mt-1">Напишите первое сообщение!</p>
            </div>
          </div>
        ) : (
          chatMessages.map((message, index) => {
            const isOwn = message.senderId === myAddr
              || message.senderId === 'current'
              || message.senderId === currentUser?.id;
            const showAvatar = !isOwn && (index === 0 || chatMessages[index - 1]?.senderId !== message.senderId);

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-2' : ''}`}
              >
                <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[65%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                  {!isOwn && (
                    <>
                      {showAvatar ? (
                        <div className={`w-8 h-8 rounded-full ${getAvatarGradient(chat.name)} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                          {chat.avatar?.slice(0, 1) || '?'}
                        </div>
                      ) : (
                        <div className="w-8 flex-shrink-0" />
                      )}
                    </>
                  )}

                  <div
                    className={`relative px-3 py-1.5 rounded-xl message-bubble ${
                      isOwn ? 'bg-[#eeffde] rounded-br-sm' : 'bg-white rounded-bl-sm'
                    } shadow-sm`}
                  >
                    <p className="text-[15px] text-gray-900 leading-snug whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : ''}`}>
                      <MessageStatus
                        status={message.status}
                        showTime={true}
                        timestamp={message.timestamp}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker */}
      {showEmoji && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-t border-gray-300 p-3"
        >
          <div className="grid grid-cols-10 gap-1">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => addEmoji(emoji)}
                className="text-xl hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2 p-2.5 bg-white dark:bg-[#212121] border-t border-gray-300 dark:border-gray-700 z-10 flex-shrink-0">
        <button className="p-2.5 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
          <Paperclip className="w-6 h-6 text-gray-500 rotate-45" />
        </button>

        <div className="flex-1 flex items-end gap-2 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2.5 min-w-0">
          <input
            ref={inputRef}
            type="text"
            placeholder={
              !isConnected
                ? 'Подключи кошелёк...'
                : !xmtpReady
                  ? 'XMTP подключается...'
                  : 'Сообщение'
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!isConnected}
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-500 text-[16px] max-h-24 min-w-0 disabled:opacity-50"
          />
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
          >
            <Smile className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {inputValue.trim() ? (
          <button
            onClick={handleSend}
            disabled={isSending}
            className="p-3 bg-[#3390ec] hover:bg-[#2b7ecc] text-white rounded-full transition-colors flex-shrink-0 disabled:opacity-50"
          >
            {isSending ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </button>
        ) : (
          <button className="p-3 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
            <Mic className="w-6 h-6 text-gray-500" />
          </button>
        )}
      </div>
    </div>
  );
}
