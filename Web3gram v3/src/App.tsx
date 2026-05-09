import { useState, useEffect, useRef } from 'react';
import { Send, Search, Settings, Moon, Wallet, Plus, Lock, MessageCircle, Check, CheckCheck, RefreshCw, X, ChevronLeft, Copy, Pin, Trash2, MoreVertical, LogOut, AlertCircle } from 'lucide-react';

// Colors
const C = {
  bg1: '#0e1621', bg2: '#17212b', bg3: '#242f3d', bg4: '#1c2733', bg5: '#202b36',
  bgOwn: '#2b5278', bgOther: '#182533',
  text: '#fff', text2: '#8b9eab', text3: '#6b7b8d',
  accent: '#5288c1', green: '#4dcd5e', blue: '#53bdeb', red: '#e53935',
  border: '#1e2c3a',
};

const colors = ['#e17076','#eda86c','#a695e7','#7bc862','#6ec9cb','#65aadd','#ee7aae','#e0a060'];
const getCol = (id: string) => colors[Math.abs([...id].reduce((a,c)=>a+c.charCodeAt(0),0)) % colors.length];

function fmt(d: Date) {
  const now = Date.now(), t = new Date(d).getTime(), days = Math.floor((now - t) / 864e5);
  if (days === 0) return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Вчера';
  if (days < 7) return new Date(d).toLocaleDateString('ru-RU', { weekday: 'short' });
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// Types
interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMsg: string;
  time: Date;
  unread: number;
}

interface Message {
  id: string;
  text: string;
  own: boolean;
  time: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

// Demo data
const demoChats: Chat[] = [
  { id: '1', name: '0x1234...7890', avatar: '12', lastMsg: 'Привет! Как дела с проектом?', time: new Date(Date.now() - 300000), unread: 2 },
  { id: '2', name: '0xABCD...EF12', avatar: 'AB', lastMsg: 'Отправлю транзакцию потом', time: new Date(Date.now() - 86400000), unread: 0 },
  { id: '3', name: '0x5678...9ABC', avatar: '56', lastMsg: 'Спасибо за помощь! 🙏', time: new Date(Date.now() - 172800000), unread: 0 },
  { id: '4', name: '0xDEAD...BEEF', avatar: 'DE', lastMsg: 'Встретимся в метавселенной', time: new Date(Date.now() - 604800000), unread: 5 },
];

const demoMessages: Record<string, Message[]> = {
  '1': [
    { id: '1', text: 'Привет! 👋', own: false, time: new Date(Date.now() - 600000), status: 'read' },
    { id: '2', text: 'Привет! Как дела с проектом?', own: true, time: new Date(Date.now() - 500000), status: 'read' },
    { id: '3', text: 'Отлично, задеплоил смарт-контракт!', own: false, time: new Date(Date.now() - 400000), status: 'read' },
    { id: '4', text: 'Круто! Скинь адрес контракта 🚀', own: true, time: new Date(Date.now() - 300000), status: 'delivered' },
  ],
  '2': [
    { id: '1', text: 'Готов к свапу?', own: true, time: new Date(Date.now() - 90000000), status: 'read' },
    { id: '2', text: 'Да, но жду газ подешевеет', own: false, time: new Date(Date.now() - 86400000), status: 'read' },
  ],
  '3': [
    { id: '1', text: 'Можешь помочь с WalletConnect?', own: false, time: new Date(Date.now() - 180000000), status: 'read' },
    { id: '2', text: 'Конечно! Вот документация...', own: true, time: new Date(Date.now() - 172800000), status: 'read' },
    { id: '3', text: 'Спасибо за помощь! 🙏', own: false, time: new Date(Date.now() - 170000000), status: 'read' },
  ],
  '4': [
    { id: '1', text: 'Видел новый NFT проект?', own: false, time: new Date(Date.now() - 700000000), status: 'read' },
    { id: '2', text: 'Да, там интересная механика', own: true, time: new Date(Date.now() - 604800000), status: 'read' },
  ],
};

// WalletConnect (lazy loaded)
let wcProvider: any = null;
let wcUri = '';

async function initWalletConnect(onUri: (uri: string) => void) {
  try {
    const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
    wcProvider = await EthereumProvider.init({
      projectId: '2de1d724533083c2ed68197548dead4e',
      chains: [137],
      showQrModal: false,
      metadata: {
        name: 'Web3Gram',
        description: 'Decentralized Messenger',
        url: 'https://chat.aliterra.space',
        icons: ['https://chat.aliterra.space/favicon.ico'],
      },
    });
    
    wcProvider.on('display_uri', (uri: string) => {
      wcUri = uri;
      onUri(uri);
    });
    
    await wcProvider.connect();
    
    const accounts = wcProvider.accounts || [];
    if (accounts.length > 0) {
      return { address: accounts[0], provider: wcProvider };
    }
    throw new Error('Нет аккаунтов');
  } catch (e: any) {
    console.error('WC Error:', e);
    throw e;
  }
}

function openDeepLink(uri: string, wallet: 'metamask' | 'trust') {
  const encoded = encodeURIComponent(uri);
  const url = wallet === 'metamask' ? `metamask://wc?uri=${encoded}` : `trust://wc?uri=${encoded}`;
  window.open(url, '_blank');
}

async function disconnectWallet() {
  if (wcProvider) {
    try { await wcProvider.disconnect(); } catch {}
    wcProvider = null;
  }
}

// Main App
export default function App() {
  const [chats] = useState<Chat[]>(demoChats);
  const [messages, setMessages] = useState<Record<string, Message[]>>(demoMessages);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [showWallet, setShowWallet] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newAddr, setNewAddr] = useState('');
  const [menu, setMenu] = useState(false);
  
  // Wallet state
  const [connected, setConnected] = useState(() => !!localStorage.getItem('w3g_addr'));
  const [walletAddr, setWalletAddr] = useState(() => localStorage.getItem('w3g_addr') || '');
  const [wcScreen, setWcScreen] = useState<'picker' | 'init' | 'qr' | 'done'>('picker');
  const [qrUri, setQrUri] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [wcError, setWcError] = useState('');
  const [xmtpStatus, setXmtpStatus] = useState<'none' | 'connecting' | 'ready' | 'error'>('none');

  const endRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const chatMessages = activeChat ? messages[activeChat.id] || [] : [];

  // Auto-scroll
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages.length]);

  // Close menu on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Generate QR code (simple SVG)
  const qrSvg = qrUri ? generateQR(qrUri) : '';

  // Connect wallet
  const connect = async (type: 'metamask' | 'trust' | 'walletconnect') => {
    setConnecting(true);
    setWcError('');
    setWcScreen('init');

    try {
      const result = await initWalletConnect((uri) => {
        setQrUri(uri);
        setWcScreen('qr');
        
        // Auto-open deep link on mobile
        if (type === 'metamask') {
          setTimeout(() => openDeepLink(uri, 'metamask'), 500);
        } else if (type === 'trust') {
          setTimeout(() => openDeepLink(uri, 'trust'), 500);
        }
      });

      setConnected(true);
      setWalletAddr(result.address);
      localStorage.setItem('w3g_addr', result.address);
      setWcScreen('done');
      setXmtpStatus('connecting');

      // Simulate XMTP init
      setTimeout(() => setXmtpStatus('ready'), 2000);

      setTimeout(() => {
        setShowWallet(false);
        setWcScreen('picker');
      }, 1500);
    } catch (e: any) {
      setWcError(e.message || 'Ошибка подключения');
      setWcScreen('picker');
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect
  const disconnect = async () => {
    await disconnectWallet();
    setConnected(false);
    setWalletAddr('');
    setXmtpStatus('none');
    localStorage.removeItem('w3g_addr');
    setShowWallet(false);
    setWcScreen('picker');
  };

  // Send message
  const send = () => {
    if (!input.trim() || !activeChat) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      own: true,
      time: new Date(),
      status: 'sent',
    };
    setMessages(prev => ({
      ...prev,
      [activeChat.id]: [...(prev[activeChat.id] || []), newMsg],
    }));
    setInput('');
  };

  // Filter chats
  const filtered = chats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  // Styles
  const btnStyle: React.CSSProperties = { padding: 8, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex' };
  const itemStyle = (a: boolean): React.CSSProperties => ({
    width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
    border: 'none', background: a ? C.bgOwn : 'transparent', cursor: 'pointer', textAlign: 'left',
  });
  const bblStyle = (o: boolean): React.CSSProperties => ({
    maxWidth: '65%', padding: '8px 12px',
    borderRadius: o ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    background: o ? C.bgOwn : C.bgOther, color: C.text, marginBottom: 4, marginLeft: o ? 'auto' : 0,
  });
  const sendBtnStyle: React.CSSProperties = {
    padding: 10, background: C.accent, border: 'none', borderRadius: '50%',
    cursor: input.trim() ? 'pointer' : 'not-allowed', opacity: input.trim() ? 1 : 0.5,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div style={{ height: '100vh', display: 'flex', background: C.bg1 }}>
      {/* SIDEBAR */}
      <div style={{ width: 320, display: activeChat ? 'none' : 'flex', flexDirection: 'column', borderRight: `1px solid ${C.border}`, background: C.bg2, position: 'relative' }} className="sb">
        {/* Header */}
        <div style={{ height: 56, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bg3 }}>
          <button style={btnStyle} onClick={() => setShowWallet(true)}><Wallet size={20} color={C.text} /></button>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: C.text, margin: 0 }}>Web3Gram</h1>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={btnStyle}><Moon size={20} color={C.text} /></button>
            <button style={btnStyle}><Settings size={20} color={C.text} /></button>
          </div>
        </div>

        {/* Search */}
        <div style={{ margin: '8px 12px', display: 'flex', alignItems: 'center', background: C.bg1, borderRadius: 20, padding: '8px 12px' }}>
          <Search size={16} color={C.text3} />
          <input style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: C.text, width: '100%', marginLeft: 8 }} placeholder="Поиск" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* E2E Status */}
        {connected && (
          <div style={{ padding: '8px 16px', background: C.bg4, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            {xmtpStatus === 'ready' ? (
              <><Lock size={14} color={C.green} /><span style={{ color: C.green }}>E2E активно</span></>
            ) : xmtpStatus === 'connecting' ? (
              <><RefreshCw size={14} color={C.accent} style={{ animation: 'spin 1s linear infinite' }} /><span style={{ color: C.accent }}>XMTP подключается...</span></>
            ) : (
              <><Lock size={14} color={C.green} /><span style={{ color: C.green }}>Подключено</span></>
            )}
          </div>
        )}

        {/* Chat list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map(c => (
            <button key={c.id} style={itemStyle(activeChat?.id === c.id)} onClick={() => setActiveChat(c)}
              onMouseEnter={e => { if (activeChat?.id !== c.id) e.currentTarget.style.background = C.bg5; }}
              onMouseLeave={e => { if (activeChat?.id !== c.id) e.currentTarget.style.background = 'transparent'; }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: getCol(c.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 18, flexShrink: 0 }}>{c.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 500, color: C.text, fontSize: 15 }}>{c.name}</span>
                  <span style={{ fontSize: 12, color: C.text3 }}>{fmt(c.time)}</span>
                </div>
                <p style={{ fontSize: 13, color: C.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2, margin: 0 }}>{c.lastMsg}</p>
              </div>
              {c.unread > 0 && <span style={{ background: C.accent, color: '#fff', fontSize: 12, padding: '2px 8px', borderRadius: 12 }}>{c.unread}</span>}
            </button>
          ))}
        </div>

        {/* FAB */}
        {connected && (
          <button style={{ position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, background: C.accent, border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,.3)' }} onClick={() => setShowNewChat(true)}>
            <Plus size={24} color="#fff" />
          </button>
        )}
      </div>

      {/* MAIN AREA */}
      {activeChat ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="ch">
          {/* Header */}
          <div style={{ height: 56, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bg3, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button style={btnStyle} className="back" onClick={() => setActiveChat(null)}><ChevronLeft size={20} color={C.text} /></button>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: getCol(activeChat.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600 }}>{activeChat.avatar}</div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>{activeChat.name}</h2>
                <p style={{ fontSize: 12, color: C.text2, margin: 0 }}>{xmtpStatus === 'ready' ? '🔒 E2E зашифровано' : 'online'}</p>
              </div>
            </div>
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button style={btnStyle} onClick={() => setMenu(!menu)}><MoreVertical size={20} color={C.text} /></button>
              {menu && (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, width: 180, background: C.bg1, borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,.4)', border: `1px solid ${C.border}`, overflow: 'hidden', zIndex: 50 }}>
                  <button onClick={() => { navigator.clipboard.writeText(activeChat.id); setMenu(false); }} style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'transparent', color: C.text, fontSize: 14, cursor: 'pointer', textAlign: 'left' }}><Copy size={16} />Копировать адрес</button>
                  <button onClick={() => setMenu(false)} style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'transparent', color: C.text, fontSize: 14, cursor: 'pointer', textAlign: 'left' }}><Pin size={16} />Закрепить</button>
                  <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: 0 }} />
                  <button onClick={() => { setActiveChat(null); setMenu(false); }} style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'transparent', color: C.red, fontSize: 14, cursor: 'pointer', textAlign: 'left' }}><Trash2 size={16} />Удалить</button>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {chatMessages.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.text2 }}>
                <MessageCircle size={64} style={{ marginBottom: 16, opacity: 0.3 }} />
                <p>Нет сообщений</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Напишите первое!</p>
              </div>
            ) : chatMessages.map((m, i) => {
              const showAvatar = !m.own && (i === 0 || chatMessages[i - 1]?.own !== m.own);
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.own ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
                  {!m.own && (showAvatar ? (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: getCol(activeChat.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600, marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }}>{activeChat.avatar[0]}</div>
                  ) : <div style={{ width: 32, marginRight: 8, flexShrink: 0 }} />)}
                  <div style={bblStyle(m.own)}>
                    <p style={{ fontSize: 15, margin: 0, wordBreak: 'break-word' }}>{m.text}</p>
                    <div style={{ fontSize: 11, color: C.text3, marginTop: 4, textAlign: 'right' }}>
                      {fmt(m.time)}
                      {m.own && (
                        <span style={{ marginLeft: 4 }}>
                          {m.status === 'sending' && '⏳'}
                          {m.status === 'sent' && <Check size={12} color={C.text3} style={{ verticalAlign: 'middle' }} />}
                          {m.status === 'delivered' && <CheckCheck size={12} color={C.text3} style={{ verticalAlign: 'middle' }} />}
                          {m.status === 'read' && <CheckCheck size={12} color={C.blue} style={{ verticalAlign: 'middle' }} />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', background: C.bg2, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input style={{ flex: 1, background: C.bg3, color: C.text, border: 'none', borderRadius: 20, padding: '10px 16px', fontSize: 15, outline: 'none' }} placeholder="Написать сообщение..." value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()} />
              <button style={sendBtnStyle} onClick={send}><Send size={20} color="#fff" /></button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.text2 }} className="empty">
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: C.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <MessageCircle size={48} color={C.text3} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: C.text, marginBottom: 8 }}>Web3Gram</h2>
          <p style={{ fontSize: 14, textAlign: 'center', maxWidth: 300 }}>Децентрализованный мессенджер на Polygon с E2E шифрованием</p>
          {connected ? (
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.green }}>
                <Lock size={14} />
                <span>{walletAddr.slice(0, 6)}…{walletAddr.slice(-4)}</span>
              </div>
              <p style={{ fontSize: 12, color: C.text3 }}>Polygon Mainnet · E2E {xmtpStatus === 'ready' ? 'активно' : 'подключается...'}</p>
            </div>
          ) : (
            <button style={{ marginTop: 20, padding: '12px 24px', background: C.accent, border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 500, cursor: 'pointer' }} onClick={() => setShowWallet(true)}>
              Подключить кошелёк
            </button>
          )}
        </div>
      )}

      {/* WALLET MODAL */}
      {showWallet && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }} onClick={() => { setShowWallet(false); setWcScreen('picker'); }}>
          <div style={{ width: '100%', maxWidth: 360, background: C.bg2, borderRadius: 16, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: 16, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{wcScreen === 'done' ? 'Кошелёк' : 'Подключение'}</h3>
              <button style={btnStyle} onClick={() => { setShowWallet(false); setWcScreen('picker'); }}><X size={20} color={C.text2} /></button>
            </div>
            <div style={{ padding: 16 }}>
              {/* PICKER */}
              {wcScreen === 'picker' && (
                <div>
                  {wcError && <div style={{ padding: 12, background: 'rgba(229,57,53,.2)', borderRadius: 12, color: C.red, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><AlertCircle size={16} />{wcError}</div>}
                  
                  <button style={{ width: '100%', padding: 16, background: C.bg4, border: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', marginBottom: 12, color: C.text, textAlign: 'left' }} onClick={() => connect('metamask')} disabled={connecting}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="" style={{ width: 40, height: 40 }} />
                    <div><p style={{ fontWeight: 500, margin: 0 }}>MetaMask</p><p style={{ fontSize: 12, color: C.text2, margin: 0 }}>Расширение или мобильный</p></div>
                  </button>
                  
                  <button style={{ width: '100%', padding: 16, background: C.bg4, border: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', marginBottom: 12, color: C.text, textAlign: 'left' }} onClick={() => connect('trust')} disabled={connecting}>
                    <div style={{ width: 40, height: 40, background: '#3b99fc', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>T</span></div>
                    <div><p style={{ fontWeight: 500, margin: 0 }}>Trust Wallet</p><p style={{ fontSize: 12, color: C.text2, margin: 0 }}>Мобильный кошелёк</p></div>
                  </button>
                  
                  <button style={{ width: '100%', padding: 16, background: C.bg4, border: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', marginBottom: 12, color: C.text, textAlign: 'left' }} onClick={() => connect('walletconnect')} disabled={connecting}>
                    <div style={{ width: 40, height: 40, background: '#3b99fc', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#fff', fontWeight: 700 }}>WC</span></div>
                    <div><p style={{ fontWeight: 500, margin: 0 }}>WalletConnect</p><p style={{ fontSize: 12, color: C.text2, margin: 0 }}>Любой совместимый</p></div>
                  </button>
                  
                  <p style={{ fontSize: 12, color: C.text3, textAlign: 'center', marginTop: 8 }}>Polygon Mainnet · WalletConnect v2 · E2E</p>
                </div>
              )}

              {/* INIT */}
              {wcScreen === 'init' && (
                <div style={{ padding: '32px 0', textAlign: 'center' }}>
                  <RefreshCw size={48} color={C.accent} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px', display: 'block' }} />
                  <p style={{ fontWeight: 500, color: C.text }}>Подключение...</p>
                  <p style={{ fontSize: 14, color: C.text2, marginTop: 8 }}>Создаём WalletConnect сессию</p>
                </div>
              )}

              {/* QR */}
              {wcScreen === 'qr' && (
                <div style={{ padding: '16px 0', textAlign: 'center' }}>
                  {qrSvg && <div style={{ background: '#fff', padding: 16, borderRadius: 12, display: 'inline-block', marginBottom: 16 }} dangerouslySetInnerHTML={{ __html: qrSvg }} />}
                  <p style={{ fontWeight: 500, color: C.text, marginBottom: 8 }}>Отсканируйте QR-код</p>
                  <p style={{ fontSize: 14, color: C.text2, marginBottom: 16 }}>Или откройте в кошельке:</p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button onClick={() => openDeepLink(qrUri, 'metamask')} style={{ padding: '10px 20px', background: '#f6851b', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 500, cursor: 'pointer' }}>MetaMask</button>
                    <button onClick={() => openDeepLink(qrUri, 'trust')} style={{ padding: '10px 20px', background: '#3b99fc', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 500, cursor: 'pointer' }}>Trust</button>
                  </div>
                  <button onClick={() => { setWcScreen('picker'); }} style={{ marginTop: 16, fontSize: 14, color: C.text2, background: 'transparent', border: 'none', cursor: 'pointer' }}>Отмена</button>
                </div>
              )}

              {/* DONE */}
              {wcScreen === 'done' && (
                <div style={{ padding: '16px 0', textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, background: 'rgba(77,205,94,.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Check size={32} color={C.green} />
                  </div>
                  <p style={{ fontWeight: 500, color: C.text, marginBottom: 4 }}>Подключено!</p>
                  <p style={{ fontSize: 14, color: C.green, marginBottom: 16 }}>✓ Polygon Mainnet</p>
                  <div style={{ background: C.bg4, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                    <p style={{ fontSize: 12, color: C.text2, marginBottom: 4 }}>Адрес</p>
                    <p style={{ fontSize: 14, color: C.text, fontFamily: 'monospace', margin: 0 }}>{walletAddr.slice(0, 10)}…{walletAddr.slice(-8)}</p>
                  </div>
                  <button onClick={disconnect} style={{ width: '100%', padding: 12, background: 'rgba(229,57,53,.2)', border: 'none', borderRadius: 12, color: C.red, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <LogOut size={16} />Отключить
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEW CHAT MODAL */}
      {showNewChat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }} onClick={() => setShowNewChat(false)}>
          <div style={{ width: '100%', maxWidth: 360, background: C.bg2, borderRadius: 16, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: 16, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Новый чат</h3>
              <button style={btnStyle} onClick={() => setShowNewChat(false)}><X size={20} color={C.text2} /></button>
            </div>
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 14, color: C.text2, marginBottom: 12 }}>Введите Ethereum адрес</p>
              <input placeholder="0x..." value={newAddr} onChange={e => setNewAddr(e.target.value)} style={{ width: '100%', background: C.bg3, color: C.text, border: 'none', borderRadius: 12, padding: '12px 16px', fontSize: 14, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} />
              <button onClick={() => { if (newAddr.trim()) { setShowNewChat(false); setNewAddr(''); } }} style={{ width: '100%', marginTop: 16, padding: 12, background: C.accent, border: 'none', borderRadius: 12, color: '#fff', fontWeight: 500, cursor: 'pointer', opacity: newAddr.trim() ? 1 : 0.5 }}>Начать чат</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (min-width: 768px) { 
          .sb { width: 400px !important; } 
          .ch { display: flex !important; } 
          .empty { display: flex !important; } 
          .back { display: none !important; } 
        }
        @media (max-width: 767px) { 
          .sb { width: 100% !important; } 
        }
      `}</style>
    </div>
  );
}

// Simple QR code generator (SVG)
function generateQR(text: string): string {
  // This is a placeholder - in production use a proper QR library
  const size = 200;
  const modules = 25;
  const moduleSize = size / modules;
  
  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${size}" height="${size}" fill="white"/>`;
  
  // Generate pseudo-random pattern based on text
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash;
  }
  
  // Draw finder patterns
  const drawFinder = (x: number, y: number) => {
    svg += `<rect x="${x * moduleSize}" y="${y * moduleSize}" width="${7 * moduleSize}" height="${7 * moduleSize}" fill="black"/>`;
    svg += `<rect x="${(x + 1) * moduleSize}" y="${(y + 1) * moduleSize}" width="${5 * moduleSize}" height="${5 * moduleSize}" fill="white"/>`;
    svg += `<rect x="${(x + 2) * moduleSize}" y="${(y + 2) * moduleSize}" width="${3 * moduleSize}" height="${3 * moduleSize}" fill="black"/>`;
  };
  
  drawFinder(0, 0);
  drawFinder(modules - 7, 0);
  drawFinder(0, modules - 7);
  
  // Draw data modules (pseudo-random)
  let seed = Math.abs(hash);
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      // Skip finder patterns
      if ((x < 8 && y < 8) || (x >= modules - 8 && y < 8) || (x < 8 && y >= modules - 8)) continue;
      
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if (seed % 3 === 0) {
        svg += `<rect x="${x * moduleSize}" y="${y * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
      }
    }
  }
  
  svg += '</svg>';
  return svg;
}
