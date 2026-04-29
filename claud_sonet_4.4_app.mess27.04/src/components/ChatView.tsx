import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Send,
  Phone,
  Video,
  MoreVertical,
  Lock,
  Smile,
  Paperclip,
  Search,
  Pin,
  Trash2,
  UserPlus,
  Bell,
  X,
  Info,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatAddress } from '../utils/wallet';
import { generateId } from '../store/useStore';
import Avatar from './Avatar';
import MessageBubble from './MessageBubble';

const EMOJIS = ['😀','😂','🥰','😎','🤔','😅','🙏','🔥','💎','🚀','💰','⚡','🎉','👍','❤️','💯','🌙','⭐','🎯','🏆'];

export default function ChatView() {
  const {
    activeChatId,
    chats,
    walletAddress,
    contacts,
    pinnedChats,
    setActiveChat,
    addMessage,
    pinChat,
    unpinChat,
    deleteChat,
  } = useStore();

  const [input, setInput] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chat = chats.find((c) => c.id === activeChatId);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages.length, scrollToBottom]);

  // Simulate typing indicator
  useEffect(() => {
    if (!chat) return;
    const timer = setTimeout(() => {
      if (Math.random() > 0.7) setIsTyping(true);
      setTimeout(() => setIsTyping(false), 2000);
    }, 3000);
    return () => clearTimeout(timer);
  }, [chat?.messages.length]);

  if (!chat) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0f0f1a] text-center p-8">
        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <Lock className="w-10 h-10 text-gray-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-300 mb-2">Выберите чат</h2>
        <p className="text-gray-500 text-sm max-w-xs">
          Все ваши сообщения зашифрованы end-to-end.<br />
          Только вы и ваш собеседник можете их прочитать.
        </p>
      </div>
    );
  }

  const otherAddress =
    chat.type === 'dm' ? chat.participants.find((p) => p !== walletAddress) || '' : '';
  const contact = contacts.find((c) => c.address === otherAddress);

  const displayName =
    chat.type === 'group'
      ? chat.name || 'Группа'
      : contact?.name || contact?.ens || formatAddress(otherAddress, 4);

  const subtitle =
    chat.type === 'group'
      ? `${chat.participants.length} участников`
      : contact?.status === 'online'
      ? 'онлайн'
      : contact?.status === 'away'
      ? 'недавно был(а)'
      : 'оффлайн';

  const isPinned = pinnedChats.includes(chat.id);

  const handleSend = () => {
    const content = input.trim();
    if (!content || !walletAddress) return;

    const message = {
      id: generateId(),
      from: walletAddress,
      to: chat.type === 'dm' ? otherAddress : chat.id,
      content,
      timestamp: Date.now(),
      type: 'text' as const,
      encrypted: true,
    };

    addMessage(chat.id, message);
    setInput('');
    setShowEmoji(false);

    // Simulate reply
    if (chat.type === 'dm' && Math.random() > 0.5) {
      const replies = [
        '👍 Понял!',
        'Интересно!',
        'Согласен 🤝',
        'Расскажи подробнее?',
        '🔥 Огонь!',
        'Ок, принято',
        'Хорошая идея!',
        '💎 Diamond hands!',
        'WAGMI 🚀',
        'Ага, понял тебя',
      ];
      const delay = 1000 + Math.random() * 3000;
      setTimeout(() => {
        const reply = {
          id: generateId(),
          from: otherAddress,
          to: walletAddress,
          content: replies[Math.floor(Math.random() * replies.length)],
          timestamp: Date.now(),
          type: 'text' as const,
          encrypted: true,
          read: false,
        };
        addMessage(chat.id, reply);
      }, delay);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: typeof chat.messages }[] = [];
  let currentDate = '';
  chat.messages.forEach((msg) => {
    const date = new Date(msg.timestamp).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
    if (date !== currentDate) {
      currentDate = date;
      groupedMessages.push({ date, messages: [] });
    }
    groupedMessages[groupedMessages.length - 1].messages.push(msg);
  });

  return (
    <div className="flex flex-col h-full bg-[#0f0f1a]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#12121f] border-b border-white/5 shadow-sm">
        <button
          onClick={() => setActiveChat(null)}
          className="lg:hidden p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <Avatar
            address={chat.type === 'group' ? chat.id : otherAddress}
            name={displayName}
            size="sm"
            status={chat.type === 'dm' ? contact?.status : undefined}
            groupCount={chat.type === 'group' ? chat.participants.length : undefined}
          />
          <div className="min-w-0">
            <div className="font-semibold text-white text-sm truncate">{displayName}</div>
            <div className="flex items-center gap-1.5">
              {isTyping ? (
                <div className="flex items-center gap-1">
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-purple-400">печатает...</span>
                </div>
              ) : (
                <>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    contact?.status === 'online' ? 'bg-green-400' :
                    contact?.status === 'away' ? 'bg-yellow-400' : 'bg-gray-500'
                  }`} />
                  <span className="text-xs text-gray-400">{subtitle}</span>
                </>
              )}
            </div>
          </div>
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <Video className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <Search className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden w-48">
                <div className="p-1">
                  {[
                    {
                      icon: isPinned ? X : Pin,
                      label: isPinned ? 'Открепить' : 'Закрепить чат',
                      action: () => { isPinned ? unpinChat(chat.id) : pinChat(chat.id); setShowMenu(false); },
                    },
                    {
                      icon: Info,
                      label: 'Информация',
                      action: () => setShowMenu(false),
                    },
                    {
                      icon: Bell,
                      label: 'Уведомления',
                      action: () => setShowMenu(false),
                    },
                    ...(chat.type === 'group' ? [{ icon: UserPlus, label: 'Добавить участника', action: () => setShowMenu(false) }] : []),
                  ].map(({ icon: Icon, label, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl text-sm transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                  <div className="border-t border-white/5 mt-1 pt-1">
                    <button
                      onClick={() => { deleteChat(chat.id); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl text-sm transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Удалить чат
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* E2E indicator */}
      <div className="flex items-center justify-center gap-1.5 py-1.5 bg-purple-900/20 border-b border-purple-500/10">
        <Lock className="w-3 h-3 text-purple-400" />
        <span className="text-xs text-purple-400/80">Сообщения зашифрованы end-to-end</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {groupedMessages.map(({ date, messages }) => (
          <div key={date}>
            <div className="flex justify-center my-4">
              <span className="text-xs text-gray-500 bg-white/5 rounded-full px-3 py-1">{date}</span>
            </div>
            {messages.map((msg, i) => {
              const prevMsg = i > 0 ? messages[i - 1] : null;
              const showAvatar = !prevMsg || prevMsg.from !== msg.from;
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  showAvatar={showAvatar}
                  isGroup={chat.type === 'group'}
                />
              );
            })}
          </div>
        ))}
        {chat.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-16 h-16 rounded-full bg-purple-600/20 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-purple-400" />
            </div>
            <p className="text-gray-400 text-sm mb-1">Нет сообщений</p>
            <p className="text-gray-600 text-xs">Отправьте первое зашифрованное сообщение</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="px-4 pb-2">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-3">
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setInput((v) => v + emoji)}
                  className="text-2xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-2 bg-[#12121f] border-t border-white/5">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${showEmoji ? 'bg-purple-600/20 text-purple-400' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
          >
            <Smile className="w-5 h-5" />
          </button>
          <button className="p-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors flex-shrink-0">
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Сообщение..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none resize-none leading-relaxed"
              style={{ minHeight: '20px', maxHeight: '120px' }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
              input.trim()
                ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105 active:scale-95'
                : 'bg-white/5 text-gray-600 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
