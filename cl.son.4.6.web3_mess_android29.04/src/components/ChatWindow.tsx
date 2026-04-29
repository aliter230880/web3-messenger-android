import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft, MoreVertical, Phone, Search, Send, Smile,
  Paperclip, Mic, CheckCheck, Check, ChevronDown,
} from 'lucide-react';
import { useStore, Message } from '../store/useStore';
import { Avatar } from './Avatar';
import { format, isToday, isYesterday } from 'date-fns';
import { formatAddress } from '../lib/web3';

function formatMsgTime(ts: number) {
  return format(new Date(ts), 'HH:mm');
}

function formatDateDivider(ts: number) {
  const d = new Date(ts);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

function MessageStatus({ status }: { status: Message['status'] }) {
  if (status === 'read') return <CheckCheck size={14} className="text-[#2aabee]" />;
  if (status === 'delivered') return <CheckCheck size={14} className="text-white/50" />;
  if (status === 'sent') return <Check size={14} className="text-white/50" />;
  return (
    <div className="w-3 h-3 border border-white/40 border-t-transparent rounded-full animate-spin" />
  );
}

interface MsgBubbleProps {
  msg: Message;
  isOwn: boolean;
  showAvatar: boolean;
}

function MsgBubble({ msg, isOwn, showAvatar }: MsgBubbleProps) {
  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-[#182533]/80 text-[#8899a8] text-xs px-3 py-1.5 rounded-full max-w-xs text-center">
          🔒 {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar space */}
      <div className="w-8 flex-shrink-0 flex items-end justify-center">
        {!isOwn && showAvatar && (
          <Avatar name={msg.senderName} address={msg.senderAddress} size="xs" />
        )}
      </div>

      <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name for groups */}
        {!isOwn && showAvatar && (
          <span className="text-[#2aabee] text-xs font-medium mb-1 ml-1">
            {msg.senderName}
          </span>
        )}

        <div
          className={`px-3 py-2 rounded-2xl shadow-sm relative ${
            isOwn
              ? 'bg-[#2b5278] rounded-br-sm'
              : 'bg-[#1e2c3a] rounded-bl-sm'
          }`}
        >
          <p className="text-[#e0eaf3] text-sm leading-relaxed whitespace-pre-wrap break-words">
            {msg.content}
          </p>
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-end'}`}>
            <span className="text-[#6c7c8c] text-[10px]">{formatMsgTime(msg.timestamp)}</span>
            {isOwn && <MessageStatus status={msg.status} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-1">
      <div className="w-8 flex-shrink-0" />
      <div className="bg-[#1e2c3a] px-4 py-3 rounded-2xl rounded-bl-sm">
        <div className="flex gap-1 items-center h-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-[#8899a8] rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatWindow() {
  const {
    activeChat,
    setActiveChat,
    messages,
    addMessage,
    wallet,
    typingUsers,
    setTypingUsers,
    updateMessage,
  } = useStore();

  const [input, setInput] = useState('');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chatMessages = activeChat ? (messages[activeChat.id] || []) : [];
  const isTyping = activeChat ? (typingUsers[activeChat.id] || []).length > 0 : false;

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [activeChat?.id]);

  useEffect(() => {
    if (!showScrollBtn) scrollToBottom();
  }, [chatMessages.length, showScrollBtn]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
  };

  const simulateReply = (chatId: string, senderName: string, senderAddress: string) => {
    const replies = [
      'That\'s great! 🔥',
      'Interesting perspective 🤔',
      'Totally agree with that!',
      'Let\'s discuss this more 📊',
      'wagmi 🚀',
      'This is the way 💪',
      'Based and blockchain-pilled',
      'Ngmi if you don\'t get this 😅',
      'LFG! 🎉',
      'ser, this is a Wendy\'s',
    ];
    const randomReply = replies[Math.floor(Math.random() * replies.length)];

    // Show typing
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
    }, 1500 + Math.random() * 1000);
  };

  const handleSend = () => {
    if (!input.trim() || !activeChat || !wallet) return;

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const msg: Message = {
      id: msgId,
      chatId: activeChat.id,
      senderId: wallet.address,
      senderAddress: wallet.address,
      senderName: formatAddress(wallet.address),
      content: input.trim(),
      timestamp: Date.now(),
      status: 'sending',
      type: 'text',
    };

    addMessage(activeChat.id, msg);
    setInput('');

    // Simulate send → delivered
    setTimeout(() => {
      updateMessage(activeChat.id, msgId, { status: 'sent' });
    }, 300);
    setTimeout(() => {
      updateMessage(activeChat.id, msgId, { status: 'delivered' });
    }, 800);
    setTimeout(() => {
      updateMessage(activeChat.id, msgId, { status: 'read' });
    }, 1800);

    // Simulate reply in private/group chats
    if (activeChat.type === 'private' && activeChat.address) {
      simulateReply(activeChat.id, activeChat.name, activeChat.address);
    } else if (activeChat.type === 'group' && activeChat.lastMessage) {
      const sender = activeChat.lastMessage;
      if (sender.senderId !== wallet.address) {
        simulateReply(activeChat.id, sender.senderName, sender.senderAddress);
      }
    }

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';

    // Simulate typing indicator cleared
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
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
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0e1621] select-none">
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#2b5278] to-[#1a3a5c] flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 4C11.2 4 4 11.2 4 20C4 28.8 11.2 36 20 36C28.8 36 36 28.8 36 20C36 11.2 28.8 4 20 4Z" stroke="#2aabee" strokeWidth="2.5"/>
              <path d="M14 16h12M14 20h8M14 24h10" stroke="#2aabee" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-white font-semibold text-xl mb-2">Web3 Messenger</h2>
            <p className="text-[#6c7c8c] text-sm max-w-xs leading-relaxed">
              Select a chat to start messaging.<br />Your conversations are encrypted with your wallet key.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#1e2c3a] px-4 py-2 rounded-full">
            <div className="w-2 h-2 bg-[#4dcd5e] rounded-full animate-pulse" />
            <span className="text-[#4dcd5e] text-sm font-medium">Secure · Decentralized · Private</span>
          </div>
        </div>
      </div>
    );
  }

  const onlineText = activeChat.type === 'private'
    ? activeChat.isOnline
      ? 'online'
      : activeChat.lastSeen
        ? `last seen ${format(new Date(activeChat.lastSeen), 'HH:mm')}`
        : 'offline'
    : activeChat.type === 'group'
      ? `${(activeChat.members?.length || 4)} members`
      : 'channel';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e1621] relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-[#17212b] border-b border-[#0e1621] z-10 flex-shrink-0">
        <button
          onClick={() => setActiveChat(null)}
          className="md:hidden w-9 h-9 rounded-full hover:bg-[#1e2c3a] flex items-center justify-center transition-colors"
        >
          <ArrowLeft size={20} className="text-[#8899a8]" />
        </button>

        <div className="flex-1 flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => setShowInfo(!showInfo)}>
          <Avatar
            name={activeChat.name}
            address={activeChat.address}
            size="sm"
            isOnline={activeChat.type === 'private' ? activeChat.isOnline : undefined}
            type={activeChat.type}
          />
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{activeChat.name}</p>
            <p className="text-[#8899a8] text-xs truncate">
              {isTyping ? (
                <span className="text-[#4dcd5e] animate-pulse">typing...</span>
              ) : (
                onlineText
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="w-9 h-9 rounded-full hover:bg-[#1e2c3a] flex items-center justify-center transition-colors">
            <Search size={18} className="text-[#8899a8]" />
          </button>
          <button className="w-9 h-9 rounded-full hover:bg-[#1e2c3a] flex items-center justify-center transition-colors">
            <Phone size={18} className="text-[#8899a8]" />
          </button>
          <button className="w-9 h-9 rounded-full hover:bg-[#1e2c3a] flex items-center justify-center transition-colors">
            <MoreVertical size={18} className="text-[#8899a8]" />
          </button>
        </div>
      </div>

      {/* Chat info panel */}
      {showInfo && (
        <div className="absolute top-16 right-0 z-20 bg-[#17212b] border border-[#2a3a4a] rounded-2xl shadow-2xl w-72 p-4 m-2">
          <div className="flex flex-col items-center gap-3 mb-4">
            <Avatar name={activeChat.name} address={activeChat.address} size="xl" type={activeChat.type} />
            <div className="text-center">
              <p className="text-white font-semibold text-lg">{activeChat.name}</p>
              {activeChat.address && (
                <p className="text-[#2aabee] text-xs font-mono">{formatAddress(activeChat.address, 6)}</p>
              )}
            </div>
          </div>
          {activeChat.description && (
            <div className="bg-[#1e2c3a] rounded-xl p-3 mb-3">
              <p className="text-[#8899a8] text-xs mb-1">Description</p>
              <p className="text-[#e0eaf3] text-sm">{activeChat.description}</p>
            </div>
          )}
          {activeChat.address && (
            <div className="bg-[#1e2c3a] rounded-xl p-3">
              <p className="text-[#8899a8] text-xs mb-1">Wallet Address</p>
              <p className="text-[#e0eaf3] text-xs font-mono break-all">{activeChat.address}</p>
            </div>
          )}
          <button onClick={() => setShowInfo(false)} className="mt-3 w-full text-center text-[#8899a8] text-sm hover:text-white">
            Close
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 py-2 space-y-0"
        style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1a2536 0%, #0e1621 100%)' }}
      >
        {grouped.map((group) => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="flex justify-center my-3">
              <div className="bg-[#182533]/90 text-[#8899a8] text-xs px-3 py-1.5 rounded-full">
                {group.date}
              </div>
            </div>
            {group.messages.map((msg, idx) => {
              const isOwn = msg.senderId === wallet?.address;
              const prevMsg = group.messages[idx - 1];
              const showAvatar = !isOwn && (
                !prevMsg || prevMsg.senderId !== msg.senderId || prevMsg.type === 'system'
              );
              return (
                <MsgBubble
                  key={msg.id}
                  msg={msg}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                />
              );
            })}
          </div>
        ))}

        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Scroll to bottom btn */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-20 right-4 w-10 h-10 bg-[#1e2c3a] border border-[#2a3a4a] rounded-full flex items-center justify-center shadow-lg hover:bg-[#243040] transition-colors z-10"
        >
          <ChevronDown size={20} className="text-[#8899a8]" />
        </button>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 px-3 py-3 bg-[#17212b] border-t border-[#0e1621] flex-shrink-0">
        <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1e2c3a] transition-colors flex-shrink-0 mb-0.5">
          <Smile size={20} className="text-[#8899a8]" />
        </button>

        <div className="flex-1 flex items-end bg-[#1e2c3a] rounded-2xl px-3 py-2 min-h-[40px] gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            rows={1}
            className="flex-1 bg-transparent text-[#e0eaf3] text-sm placeholder-[#6c7c8c] outline-none resize-none leading-relaxed"
            style={{ maxHeight: '120px', minHeight: '20px' }}
          />
          <button className="mb-0.5 flex-shrink-0">
            <Paperclip size={18} className="text-[#6c7c8c] hover:text-[#8899a8] transition-colors" />
          </button>
        </div>

        <button
          onClick={input.trim() ? handleSend : undefined}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 mb-0.5 ${
            input.trim()
              ? 'bg-[#2aabee] hover:bg-[#1e96c8] shadow-lg shadow-[#2aabee]/20'
              : 'bg-[#1e2c3a] hover:bg-[#243040]'
          }`}
        >
          {input.trim() ? (
            <Send size={18} className="text-white translate-x-0.5 -translate-y-0.5" />
          ) : (
            <Mic size={18} className="text-[#8899a8]" />
          )}
        </button>
      </div>
    </div>
  );
}
