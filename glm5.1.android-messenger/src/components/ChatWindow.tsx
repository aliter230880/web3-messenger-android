import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, MoreVertical, Phone, Search,
  Send, Mic, Paperclip, Smile, Check, CheckCheck,
  ChevronDown, Reply, Copy, Forward, Pin, Trash2
} from 'lucide-react';
import { useStore, Message } from '../store/useStore';
import { Avatar } from './Avatar';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';

function formatDateDivider(timestamp: number): string {
  const date = new Date(timestamp);
  if (isToday(date)) return 'Сегодня';
  if (isYesterday(date)) return 'Вчера';
  return format(date, 'd MMMM yyyy', { locale: ru });
}

function formatMsgTime(timestamp: number): string {
  return format(new Date(timestamp), 'HH:mm');
}

function MessageStatus({ status }: { status: Message['status'] }) {
  if (status === 'sending') return <div className="w-3 h-3 border-[1.5px] border-[#6fa853]/40 border-t-[#6fa853] rounded-full animate-spin" />;
  if (status === 'sent') return <Check size={16} className="text-[#6fa853]" strokeWidth={2.5} />;
  if (status === 'delivered') return <CheckCheck size={16} className="text-[#6fa853]" strokeWidth={2.5} />;
  return <CheckCheck size={16} className="text-[#4dc95e]" strokeWidth={2.5} />;
}

/* Telegram-style bubble tail using CSS */
function BubbleTail({ isOwn }: { isOwn: boolean }) {
  if (isOwn) {
    return (
      <svg className="absolute -right-[10px] bottom-0 w-[11px] h-[19px] overflow-visible" viewBox="0 0 11 19" fill="none">
        <path d="M 0 19 L 0 6 C 0 2.686 2.686 0 6 0 L 6 0 L 6 0 C 6 0 5.5 3.5 5 7 C 4.5 10.5 11 15 11 19 Z" fill="#eeffde" />
      </svg>
    );
  }
  return (
    <svg className="absolute -left-[10px] bottom-0 w-[11px] h-[19px] overflow-visible" viewBox="0 0 11 19" fill="none">
      <path d="M 11 19 L 11 6 C 11 2.686 8.314 0 5 0 L 5 0 L 5 0 C 5 0 5.5 3.5 6 7 C 6.5 10.5 0 15 0 19 Z" fill="#ffffff" />
    </svg>
  );
}

interface MsgBubbleProps {
  msg: Message;
  isOwn: boolean;
  showAvatar: boolean;
  isFirst: boolean;
  isLast: boolean;
  showTail: boolean;
}

function MsgBubble({ msg, isOwn, showAvatar, isFirst, isLast, showTail }: MsgBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);

  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-3 animate-fade-in">
        <div className="bg-[#182533] rounded-[16px] px-3 py-[5px]">
          <span className="text-[#8899a8] text-[13px]">🔒 {msg.content}</span>
        </div>
      </div>
    );
  }

  /* Bubble radius — Telegram style:
     First in group: top corners big + one tail corner
     Last in group: bottom corners big + one tail corner
     Middle: all corners medium
     Single: all corners big + tail
  */
  const getRadius = () => {
    if (isFirst && isLast) {
      return isOwn
        ? 'rounded-tl-[18px] rounded-tr-[18px] rounded-bl-[18px] rounded-br-[6px]'
        : 'rounded-tl-[18px] rounded-tr-[18px] rounded-bl-[6px] rounded-br-[18px]';
    }
    if (isFirst) {
      return isOwn
        ? 'rounded-tl-[18px] rounded-tr-[18px] rounded-bl-[18px] rounded-br-[18px]'
        : 'rounded-tl-[18px] rounded-tr-[18px] rounded-bl-[18px] rounded-br-[18px]';
    }
    if (isLast) {
      return isOwn
        ? 'rounded-tl-[6px] rounded-tr-[18px] rounded-bl-[18px] rounded-br-[6px]'
        : 'rounded-tl-[18px] rounded-tr-[6px] rounded-bl-[6px] rounded-br-[18px]';
    }
    return isOwn
      ? 'rounded-tl-[6px] rounded-tr-[18px] rounded-bl-[18px] rounded-br-[18px]'
      : 'rounded-tl-[18px] rounded-tr-[6px] rounded-bl-[18px] rounded-br-[18px]';
  };

  return (
    <div
      className={`flex items-end gap-[6px] ${isFirst ? 'mt-[6px]' : 'mt-[2px]'} ${isOwn ? 'flex-row-reverse' : ''} ${
        isLast ? 'mb-[2px]' : ''
      }`}
    >
      {/* Avatar space */}
      <div className="w-[30px] flex-shrink-0">
        {!isOwn && showAvatar && isLast && (
          <Avatar name={msg.senderName} address={msg.senderAddress} size="xs" />
        )}
      </div>

      {/* Bubble */}
      <div className={`relative max-w-[min(65%,480px)] ${getRadius()} px-[10px] pt-[6px] pb-[5px] ${
        isOwn ? 'bg-[#eeffde]' : 'bg-white'
      } shadow-[0_1px_1px_rgba(0,0,0,0.08)]`}>

        {/* Tail SVG */}
        {showTail && isLast && <BubbleTail isOwn={isOwn} />}

        {/* Sender name for groups */}
        {!isOwn && showAvatar && (
          <p className="text-[#3390d0] text-[13px] font-semibold mb-[2px] leading-tight">{msg.senderName}</p>
        )}

        {/* Message text with inline time — Telegram style */}
        <div className="relative">
          <p className={`text-[15px] leading-[21px] whitespace-pre-wrap break-words inline ${
            isOwn ? 'text-[#2b5f14]' : 'text-[#17212b]'
          }`}>
            {msg.content}
          </p>
          {/* Inline time + status */}
          <span className="inline-flex items-center gap-[3px] align-middle ml-[12px] float-right leading-[21px] mt-[4px]">
            <span className={`text-[12px] ${isOwn ? 'text-[#6fa853]' : 'text-[#a0acb8]'}`}>
              {formatMsgTime(msg.timestamp)}
            </span>
            {isOwn && <MessageStatus status={msg.status} />}
          </span>
        </div>

        {/* Context menu */}
        {showMenu && (
          <div className={`absolute top-full mt-1 z-30 ${
            isOwn ? 'right-0' : 'left-0'
          } bg-[#1e2c3a] rounded-[12px] shadow-[0_2px_10px_rgba(0,0,0,0.3)] py-[3px] min-w-[190px] animate-pop-in`} style={{ border: '1px solid #2a3a4a' }}>
            <ContextMenuItem icon={Reply} label="Ответить" onClick={() => setShowMenu(false)} />
            <ContextMenuItem icon={Copy} label="Копировать" onClick={() => {
              navigator.clipboard?.writeText(msg.content);
              setShowMenu(false);
            }} />
            <ContextMenuItem icon={Forward} label="Переслать" onClick={() => setShowMenu(false)} />
            <ContextMenuItem icon={Pin} label="Закрепить" onClick={() => setShowMenu(false)} />
            <div className="h-px bg-[#2a3a4a] my-[3px]" />
            <ContextMenuItem icon={Trash2} label="Удалить" onClick={() => setShowMenu(false)} danger />
          </div>
        )}
      </div>
    </div>
  );
}

function ContextMenuItem({ icon: Icon, label, onClick, danger }: {
  icon: any; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full flex items-center gap-3 px-4 py-[10px] hover:bg-[#243040] transition-colors first:rounded-t-[10px] last:rounded-b-[10px] ${
        danger ? 'text-[#e25555]' : 'text-[#e0eaf3]'
      }`}
    >
      <Icon size={18} />
      <span className="text-[14px]">{label}</span>
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-[6px] mb-[2px]">
      <div className="w-[30px]" />
      <div className="bg-white rounded-[18px] rounded-bl-[6px] px-[14px] py-[10px] shadow-[0_1px_1px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-[3px]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-[7px] h-[7px] rounded-full bg-[#8899a8] typing-dot" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatWindow() {
  const {
    activeChat, setActiveChat, messages, addMessage, wallet,
    typingUsers, setTypingUsers, updateMessage, setShowMobileChat,
  } = useStore();

  const [input, setInput] = useState('');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chatMessages = activeChat ? (messages[activeChat.id] || []) : [];
  const isTyping = activeChat ? (typingUsers[activeChat.id] || []).length > 0 : false;

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [activeChat?.id, scrollToBottom]);

  useEffect(() => {
    if (!showScrollBtn) scrollToBottom();
  }, [chatMessages.length, showScrollBtn, scrollToBottom]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 150);
  };

  const simulateReply = (chatId: string, senderName: string, senderAddress: string) => {
    const replies = [
      'Это отличная идея! 🔥', 'Интересно, расскажи подробнее 🤔',
      'Полностью согласен!', 'Давай обсудим это подробнее 📊',
      'Wagmi! 🚀', 'Так и есть 💪', 'LFG! 🎉', 'Абсолютно! 🙌',
      'Нужно подумать над этим 🧐', 'Скоро будет больше новостей 📢',
    ];
    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    setTypingUsers(chatId, [senderName]);

    setTimeout(() => {
      setTypingUsers(chatId, []);
      const replyMsg: Message = {
        id: `msg_${Date.now()}_reply`,
        chatId,
        senderId: senderAddress,
        senderAddress,
        senderName,
        content: randomReply,
        timestamp: Date.now(),
        status: 'delivered',
        type: 'text',
      };
      useStore.getState().addMessage(chatId, replyMsg);
    }, 1500 + Math.random() * 1500);
  };

  const handleSend = () => {
    if (!input.trim() || !activeChat || !wallet) return;

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const msg: Message = {
      id: msgId,
      chatId: activeChat.id,
      senderId: wallet.address,
      senderAddress: wallet.address,
      senderName: 'You',
      content: input.trim(),
      timestamp: Date.now(),
      status: 'sending',
      type: 'text',
    };

    addMessage(activeChat.id, msg);
    setInput('');

    setTimeout(() => updateMessage(activeChat.id, msgId, { status: 'sent' }), 300);
    setTimeout(() => updateMessage(activeChat.id, msgId, { status: 'delivered' }), 800);
    setTimeout(() => updateMessage(activeChat.id, msgId, { status: 'read' }), 2000);

    if (activeChat.type === 'private' && activeChat.address) {
      simulateReply(activeChat.id, activeChat.name, activeChat.address);
    } else if (activeChat.type === 'group' && activeChat.lastMessage) {
      const sender = activeChat.lastMessage;
      if (sender.senderId !== wallet.address) {
        simulateReply(activeChat.id, sender.senderName, sender.senderAddress);
      }
    }

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
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
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = [];
  chatMessages.forEach((msg) => {
    const dateStr = formatDateDivider(msg.timestamp);
    const last = grouped[grouped.length - 1];
    if (!last || last.date !== dateStr) {
      grouped.push({ date: dateStr, messages: [msg] });
    } else {
      last.messages.push(msg);
    }
  });

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0e1621] relative">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative z-10 flex flex-col items-center animate-fade-in-up">
          <div className="w-[120px] h-[120px] rounded-full bg-[#17212b] flex items-center justify-center mb-6">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="28" cy="24" r="9" fill="#2aabee" opacity="0.25" />
              <path d="M14 38c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="#2aabee" strokeWidth="2.5" strokeLinecap="round" opacity="0.25" />
              <path d="M18 42h20" stroke="#2aabee" strokeWidth="2.5" strokeLinecap="round" opacity="0.15" />
              <path d="M22 46h12" stroke="#2aabee" strokeWidth="2.5" strokeLinecap="round" opacity="0.08" />
            </svg>
          </div>
          <h2 className="text-white text-[20px] font-semibold mb-2">Выберите чат</h2>
          <p className="text-[#6c7c8c] text-[14px] text-center max-w-[280px] leading-relaxed">
            Выберите чат из списка, чтобы начать общение. Все сообщения защищены сквозным шифрованием.
          </p>
          <div className="flex items-center gap-2 mt-6">
            <div className="w-[6px] h-[6px] rounded-full bg-[#4dcd5e]" />
            <span className="text-[#6c7c8c] text-[12px]">Безопасно · Децентрализовано · Приватно</span>
          </div>
        </div>
      </div>
    );
  }

  const onlineText = activeChat.type === 'private'
    ? activeChat.isOnline
      ? 'в сети'
      : activeChat.lastSeen
        ? `был(а) в ${format(new Date(activeChat.lastSeen), 'HH:mm')}`
        : 'не в сети'
    : activeChat.type === 'group'
      ? `${(activeChat.members?.length || 4)} участников, онлайн`
      : 'канал';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e1621] relative">
      {/* Wallpaper */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(135deg, #0e1621 0%, #111b27 50%, #0e1621 100%)',
        opacity: 1
      }} />
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M40 40l10-20h20L60 40l10 20H50L40 40zm0-40L30 20H10l10-20L10-20h20L40 0z' fill-opacity='0.03'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      {/* Header */}
      <div className="flex items-center gap-1 px-2 py-[5px] bg-[#17212b] relative z-10" style={{ borderBottom: '1px solid #1e2c3a33' }}>
        {/* Back button - mobile */}
        <button
          onClick={() => { setActiveChat(null); setShowMobileChat(false); }}
          className="w-[48px] h-[48px] rounded-full flex items-center justify-center transition-colors md:hidden"
        >
          <ArrowLeft size={24} className="text-[#8899a8]" />
        </button>

        {/* Chat info */}
        <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer py-1">
          <Avatar
            name={activeChat.name}
            address={activeChat.address || activeChat.id}
            size="sm"
            isOnline={activeChat.isOnline && activeChat.type === 'private'}
            type={activeChat.type === 'channel' ? 'channel' : activeChat.type === 'group' ? 'group' : 'private'}
          />
          <div className="min-w-0">
            <p className="text-white font-semibold text-[16px] truncate leading-tight">{activeChat.name}</p>
            <p className={`text-[13px] mt-[1px] ${isTyping ? 'text-[#2aabee]' : 'text-[#8899a8]'}`}>
              {isTyping ? 'печатает...' : onlineText}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0">
          <button className="w-[48px] h-[48px] rounded-full flex items-center justify-center transition-colors">
            <Phone size={20} className="text-[#8899a8]" />
          </button>
          <button className="w-[48px] h-[48px] rounded-full flex items-center justify-center transition-colors">
            <Search size={20} className="text-[#8899a8]" />
          </button>
          <button className="w-[48px] h-[48px] rounded-full flex items-center justify-center transition-colors">
            <MoreVertical size={20} className="text-[#8899a8]" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-[8%] py-3 relative z-10"
      >
        {/* Encryption notice */}
        <div className="flex justify-center my-4">
          <div className="bg-[#182533] rounded-[12px] px-3 py-[5px] flex items-center gap-1.5">
            <span className="text-[12px]">🔒</span>
            <span className="text-[#8899a8] text-[12px]">
              Сообщения защищены сквозным шифрованием
            </span>
          </div>
        </div>

        {grouped.map((group) => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="flex justify-center my-4">
              <div className="bg-[#182533] rounded-[12px] px-3 py-[5px]">
                <span className="text-[#8899a8] text-[13px] font-medium">{group.date}</span>
              </div>
            </div>

            {group.messages.map((msg, idx) => {
              const isOwn = msg.senderId === wallet?.address;
              const prevMsg = group.messages[idx - 1];
              const nextMsg = group.messages[idx + 1];
              const showAvatar = !isOwn && (
                !prevMsg || prevMsg.senderId !== msg.senderId || prevMsg.type === 'system'
              );
              const isFirst = !prevMsg || prevMsg.senderId !== msg.senderId || prevMsg.type === 'system';
              const isLast = !nextMsg || nextMsg.senderId !== msg.senderId || nextMsg.type === 'system';
              const showTail = isFirst;

              return (
                <MsgBubble
                  key={msg.id}
                  msg={msg}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  isFirst={isFirst}
                  isLast={isLast}
                  showTail={showTail}
                />
              );
            })}
          </div>
        ))}

        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-[80px] right-5 w-[42px] h-[42px] rounded-full bg-[#17212b]/90 shadow-[0_1px_4px_rgba(0,0,0,0.3)] flex items-center justify-center z-20 hover:bg-[#1e2c3a] transition-all animate-pop-in"
        >
          <ChevronDown size={22} className="text-[#8899a8]" />
        </button>
      )}

      {/* Input area — Telegram style */}
      <div className="px-2 py-[5px] bg-[#17212b] relative z-10 safe-bottom" style={{ borderTop: '1px solid #1e2c3a33' }}>
        <div className="flex items-end gap-0 bg-[#1e2c3a] rounded-[22px] pl-1 pr-1">
          {/* Emoji button */}
          <button className="w-[44px] h-[44px] rounded-full flex items-center justify-center transition-colors flex-shrink-0 hover:bg-[#243040]">
            <Smile size={24} className="text-[#8899a8]" />
          </button>

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение"
            rows={1}
            className="msg-input flex-1 bg-transparent text-[#e0eaf3] text-[16px] placeholder-[#8899a8] outline-none py-[10px] px-1 min-h-[44px] leading-[22px]"
          />

          {/* Send / Mic buttons */}
          {input.trim() ? (
            <button
              onClick={handleSend}
              className="w-[44px] h-[44px] rounded-full bg-[#2aabee] hover:bg-[#229ED9] active:bg-[#1a7fb0] flex items-center justify-center transition-all flex-shrink-0 active:scale-90"
            >
              <Send size={20} className="text-white ml-[2px]" />
            </button>
          ) : (
            <div className="flex items-center flex-shrink-0">
              <button className="w-[44px] h-[44px] rounded-full flex items-center justify-center transition-colors hover:bg-[#243040]">
                <Paperclip size={22} className="text-[#8899a8]" style={{ transform: 'rotate(-45deg)' }} />
              </button>
              <button className="w-[44px] h-[44px] rounded-full flex items-center justify-center transition-colors hover:bg-[#243040]">
                <Mic size={22} className="text-[#8899a8]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
