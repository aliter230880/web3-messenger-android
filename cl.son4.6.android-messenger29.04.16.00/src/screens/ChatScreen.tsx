import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { formatTime, formatDate, shortAddr } from '../utils/web3';
import type { Message } from '../types';

export default function ChatScreen() {
  const { messages, activeChat, contacts, userAddress, sendMessage, sending, setScreen, refreshMessages } = useApp();
  const [text, setText] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const contact = contacts.find(c => c.address.toLowerCase() === activeChat?.toLowerCase());
  const peerName = contact?.name || (activeChat ? shortAddr(activeChat) : '');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(refreshMessages, 15000);
    return () => clearInterval(interval);
  }, [refreshMessages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const msg = text.trim();
    setText('');
    await sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  messages.forEach(msg => {
    const dateStr = formatDate(msg.timestamp);
    const last = grouped[grouped.length - 1];
    if (!last || last.date !== dateStr) {
      grouped.push({ date: dateStr, msgs: [msg] });
    } else {
      last.msgs.push(msg);
    }
  });

  return (
    <div className="h-full flex flex-col bg-[#efeff4]">
      {/* Header */}
      <div className="bg-white flex items-center gap-3 px-2 pt-12 pb-2 shadow-sm flex-shrink-0">
        <button
          onClick={() => setScreen('chats')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200"
        >
          <svg className="w-6 h-6 text-[#2481cc]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>

        <button className="flex items-center gap-3 flex-1 min-w-0" onClick={() => setShowInfo(!showInfo)}>
          <Avatar address={activeChat || ''} name={peerName} size="sm" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-[15px] truncate">{peerName}</p>
            <p className="text-xs text-gray-400 truncate">{activeChat ? shortAddr(activeChat) : ''}</p>
          </div>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={refreshMessages}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
              <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
              <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      {/* E2E indicator */}
      <div className="flex items-center justify-center py-1 bg-[#efeff4]">
        <div className="flex items-center gap-1.5 bg-white/80 px-3 py-1 rounded-full">
          <svg className="w-3 h-3 text-[#2481cc]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          <span className="text-[10px] text-gray-500 font-medium">E2E шифрование • Polygon</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm">
              <span className="text-3xl">🔐</span>
            </div>
            <p className="text-gray-500 text-sm font-medium">Нет сообщений</p>
            <p className="text-gray-400 text-xs mt-1">Начните зашифрованный разговор</p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-3">
                <div className="bg-black/30 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                  {group.date}
                </div>
              </div>
              {group.msgs.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef}/>
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-gray-100 px-3 py-2 flex items-end gap-2 flex-shrink-0">
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 flex-shrink-0 mb-0.5">
          <svg className="w-6 h-6 text-[#2481cc]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <path strokeLinecap="round" d="M8 12h.01M12 12h.01M16 12h.01"/>
          </svg>
        </button>

        <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 min-h-[44px] flex items-center">
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            rows={1}
            className="flex-1 bg-transparent text-gray-900 text-sm placeholder-gray-400 resize-none outline-none leading-5 max-h-28"
            style={{ height: 'auto' }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 transition-all ${text.trim() ? 'bg-[#2481cc] active:scale-95 shadow-md' : 'bg-gray-200'}`}
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
          ) : text.trim() ? (
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Peer Info Modal */}
      {showInfo && (
        <div className="absolute inset-0 z-50 flex items-end" onClick={() => setShowInfo(false)}>
          <div className="w-full bg-white rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-3 mb-4">
              <Avatar address={activeChat || ''} name={peerName} size="xl" />
              <h2 className="text-xl font-bold text-gray-900">{peerName}</h2>
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
                <span className="text-xs text-gray-500 font-mono">{activeChat}</span>
                <button onClick={() => { navigator.clipboard?.writeText(activeChat || ''); }}>
                  <svg className="w-4 h-4 text-[#2481cc]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: '🔐', label: 'E2E' },
                { icon: '⛓️', label: 'Polygon' },
                { icon: '🌐', label: 'Web3' },
              ].map(f => (
                <div key={f.label} className="flex flex-col items-center gap-1 bg-gray-50 p-3 rounded-2xl">
                  <span className="text-2xl">{f.icon}</span>
                  <span className="text-xs text-gray-600 font-medium">{f.label}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowInfo(false)} className="w-full mt-4 py-3 bg-gray-100 rounded-2xl text-gray-600 font-medium">
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isMine = msg.isMine;

  return (
    <div className={`flex mb-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] px-3 py-2 rounded-2xl relative ${
          isMine
            ? 'bg-[#2481cc] text-white rounded-br-sm'
            : 'bg-white text-gray-900 rounded-bl-sm shadow-sm'
        } ${msg.pending ? 'opacity-70' : ''} ${msg.failed ? 'border border-red-300' : ''}`}
      >
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
        <div className={`flex items-center justify-end gap-1 mt-0.5 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
          <span className="text-[10px]">{formatTime(msg.timestamp)}</span>
          {isMine && (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              {msg.pending ? (
                <path strokeLinecap="round" d="M12 8v4l3 3"/>
              ) : msg.failed ? (
                <path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
              ) : (
                <path strokeLinecap="round" d="M5 13l4 4L19 7"/>
              )}
            </svg>
          )}
        </div>
        {/* Triangle */}
        <div
          className={`absolute bottom-0 w-2 h-2 ${
            isMine
              ? 'right-[-6px] bg-[#2481cc]'
              : 'left-[-6px] bg-white'
          }`}
          style={{
            clipPath: isMine ? 'polygon(0 0, 0 100%, 100% 100%)' : 'polygon(100% 0, 0 100%, 100% 100%)',
          }}
        />
      </div>
    </div>
  );
}
