import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Paperclip, Mic, Smile, Phone, Video, MoreVertical } from 'lucide-react';
import { useAppStore } from '../store';
import { useWeb3Messenger } from '../hooks/useWeb3Messenger';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { MessageStatus } from './MessageStatus';
import { LoadingSpinner } from './LoadingSpinner';

interface ChatViewProps {
  chatId: string;
  onBack: () => void;
}

export function ChatView({ chatId, onBack }: ChatViewProps) {
  const { chats, messages, addMessage, currentUser } = useAppStore();
  const { sendMessage, getMessages } = useWeb3Messenger();
  const [inputValue, setInputValue] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chat = chats.find((c) => c.id === chatId);
  const chatMessages = messages[chatId] || [];

  // Загрузка сообщений при открытии чата
  useEffect(() => {
    const loadMessages = async () => {
      if (!chat) return;
      
      try {
        setIsLoading(true);
        const participant = chat.participants[0];
        if (participant?.walletAddress) {
          await getMessages(participant.walletAddress);
          // Интеграция с store (TODO)
        }
      } catch (error) {
        console.error('Ошибка загрузки сообщений:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [chatId, chat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    try {
      setIsSending(true);
      
      const newMessage = {
        id: `m-${Date.now()}`,
        chatId,
        senderId: currentUser?.id || 'current',
        content: inputValue.trim(),
        timestamp: new Date(),
        status: 'sending' as const,
        type: 'text' as const,
      };

      addMessage(chatId, newMessage);
      setInputValue('');
      setShowEmoji(false);

      // Отправка через XMTP
      const participant = chat?.participants[0];
      if (participant?.walletAddress) {
        await sendMessage(participant.walletAddress, inputValue.trim());
        
        // Обновление статуса на "sent"
        // (TODO: updateMessageStatus)
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      // Обновление статуса на "error"
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji: string) => {
    setInputValue((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  // MessageStatus компонент теперь импортируется

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

  if (!chat) return null;

  return (
    <div className="flex flex-col h-full chat-bg">
      {/* Header - Telegram Style */}
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
            <h3 className="font-semibold text-gray-900 truncate">
              {chat.name}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {chat.type === 'private' 
                ? chat.participants[0]?.isOnline 
                  ? 'в сети' 
                  : chat.participants[0]?.lastSeen
                    ? `был(а) ${format(chat.participants[0].lastSeen, 'dd MMMM в HH:mm', { locale: ru })}`
                    : 'оффлайн'
                : `${chat.participants.length} участников`
              }
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

      {/* Messages - Telegram Style */}
      <div className="flex-1 overflow-y-auto p-2.5 md:p-4 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="md" text="Загрузка сообщений..." />
          </div>
        ) : (
          chatMessages.map((message, index) => {
            const isOwn = message.senderId === currentUser?.id;
            const showAvatar = !isOwn && (index === 0 || chatMessages[index - 1]?.senderId !== message.senderId);

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-2' : ''}`}
              >
              <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[65%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                {!isOwn && (
                  <>
                    {showAvatar && (
                      <div className={`w-8 h-8 rounded-full ${getAvatarGradient(chat.name)} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                        {chat.avatar?.slice(0, 1) || '?'}
                      </div>
                    )}
                    {!showAvatar && <div className="w-8" />}
                  </>
                )}
                
                <div
                  className={`relative px-3 py-1.5 rounded-xl message-bubble ${
                    isOwn
                      ? 'bg-[#eeffde] rounded-br-sm'
                      : 'bg-white rounded-bl-sm'
                  } shadow-sm`}
                >
                  {!isOwn && !showAvatar && (
                    <div className="absolute -top-1 left-2 w-2 h-2 bg-white" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
                  )}
                  {isOwn && (
                    <div className="absolute -top-1 right-2 w-2 h-2 bg-[#eeffde]" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
                  )}
                  
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
        
        {/* Индикатор набора текста (TODO: integrate with real typing status) */}
        {/* <TypingIndicator /> */}
      </div>

      {/* Emoji Picker */}
      {showEmoji && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-white border-t border-gray-300 p-3"
        >
          <div className="grid grid-cols-8 gap-1.5">
            {['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '👎', '❤️', '🔥', '🎉', '✨', '🚀', '💎', '💰', '📈', '👋', '🙏', '💪', '🤝', '👀', '🎯', '✅', '❌', '⭐', '🌟', '💯', '🙌', '🤗', '😴'].map((emoji) => (
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

      {/* Input Area - Telegram Style */}
      <div className="flex items-end gap-2 p-2.5 bg-white border-t border-gray-300 z-10">
        <button className="p-2.5 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
          <Paperclip className="w-6 h-6 text-gray-500 rotate-45" />
        </button>
        
        <div className="flex-1 flex items-end gap-2 bg-gray-100 rounded-2xl px-4 py-2.5">
          <input
            ref={inputRef}
            type="text"
            placeholder="Сообщение"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500 text-[16px] max-h-24"
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
