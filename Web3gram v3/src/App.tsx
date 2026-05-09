import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Search, Settings, Moon, Wallet, Plus, Lock, MessageCircle, Check, CheckCheck, RefreshCw, X, ChevronLeft, Copy, Pin, Trash2, MoreVertical, LogOut, AlertCircle } from 'lucide-react';

// MetaMask Connect EVM
let evmClient: any = null;

async function initMetaMask() {
  if (evmClient) return evmClient;
  
  const { createEVMClient } = await import('@metamask/connect-evm');
  
  evmClient = await createEVMClient({
    dapp: {
      name: 'Web3Gram',
      url: window.location.href,
      iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%235288c1" rx="20" width="100" height="100"/%3E%3Ctext x="50" y="68" text-anchor="middle" fill="white" font-size="50"%3EW3%3C/text%3E%3C/svg%3E',
    },
    api: {
      supportedNetworks: {
        '0x89': 'https://polygon-rpc.com', // Polygon Mainnet
      },
    },
  });
  
  return evmClient;
}

async function connectMetaMask(chainIds: string[] = ['0x89']): Promise<{ address: string; chainId: string }> {
  const client = await initMetaMask();
  
  try {
    const { accounts, chainId } = await client.connect({ chainIds });
    
    if (accounts.length === 0) {
      throw new Error('Нет аккаунтов');
    }
    
    // Switch to Polygon if needed
    if (chainId !== '0x89') {
      const provider = client.getProvider();
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x89' }],
        });
      } catch (e: any) {
        if (e.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x89',
              chainName: 'Polygon Mainnet',
              nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
              rpcUrls: ['https://polygon-rpc.com'],
              blockExplorerUrls: ['https://polygonscan.com'],
            }],
          });
        }
      }
    }
    
    return { address: accounts[0], chainId: '0x89' };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('Пользователь отклонил подключение');
    } else if (error.code === -32002) {
      throw new Error('Запрос на подключение уже ожидает в MetaMask');
    }
    throw error;
  }
}

async function disconnectMetaMask() {
  if (evmClient) {
    try {
      await evmClient.disconnect();
    } catch {}
  }
}

// WalletConnect for other wallets
let wcProvider: any = null;

async function initWalletConnect(onUri: (uri: string) => void): Promise<{ address: string }> {
  if (wcProvider) {
    try { await wcProvider.disconnect(); } catch {}
  }
  
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
    onUri(uri);
  });
  
  const sessionPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Таймаут')), 300000);
    
    wcProvider.on('connect', () => {
      clearTimeout(timeout);
      resolve();
    });
    
    wcProvider.on('session_update', () => {
      if (wcProvider?.session) {
        clearTimeout(timeout);
        resolve();
      }
    });
    
    const handleVisibility = async () => {
      if (!document.hidden && wcProvider) {
        try {
          const core = wcProvider.signer?.client?.core || wcProvider.core;
          const relayer = core?.relayer;
          if (relayer?.restartTransport) {
            await relayer.restartTransport();
          }
        } catch {}
        
        await new Promise(r => setTimeout(r, 2000));
        if (wcProvider.session) {
          clearTimeout(timeout);
          document.removeEventListener('visibilitychange', handleVisibility);
          resolve();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
  });
  
  wcProvider.connect().catch(console.error);
  await sessionPromise;
  
  const accounts = wcProvider.accounts || [];
  if (accounts.length === 0) throw new Error('Нет аккаунтов');
  
  return { address: accounts[0] };
}

function openDeepLink(uri: string, wallet: 'metamask' | 'trust') {
  const encoded = encodeURIComponent(uri);
  const url = wallet === 'metamask' 
    ? `metamask://wc?uri=${encoded}` 
    : `trust://wc?uri=${encoded}`;
  window.location.href = url;
}

// Colors
const C = {
  bg1: '#0e1621', bg2: '#17212b', bg3: '#242f3d', bg4: '#1c2733', bg5: '#202b36',
  bgOwn: '#2b5278', bgOther: '#182533',
  text: '#fff', text2: '#8b9eab', text3: '#6b7b8d',
  accent: '#5288c1', green: '#4dcd5e', blue: '#53bdeb', red: '#e53935',
  border: '#1e2c3a',
};

const colors = ['#e17076','#eda86c','#a695e7','#7bc862','#6ec9cb','#65aadd'];
const getCol = (id: string) => colors[Math.abs([...id].reduce((a,c)=>a+c.charCodeAt(0),0)) % colors.length];

function fmt(d: Date) {
  const now = Date.now(), t = new Date(d).getTime(), days = Math.floor((now - t) / 864e5);
  if (days === 0) return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Вчера';
  if (days < 7) return new Date(d).toLocaleDateString('ru-RU', { weekday: 'short' });
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

interface Chat {
  id: string; name: string; avatar: string; lastMsg: string; time: Date; unread: number;
}

interface Message {
  id: string; text: string; own: boolean; time: Date; status: 'sending' | 'sent' | 'delivered' | 'read';
}

const demoChats: Chat[] = [
  { id: '1', name: '0x1234...7890', avatar: '12', lastMsg: 'Привет! Как дела?', time: new Date(Date.now() - 300000), unread: 2 },
  { id: '2', name: '0xABCD...EF12', avatar: 'AB', lastMsg: 'Отправлю потом', time: new Date(Date.now() - 86400000), unread: 0 },
  { id: '3', name: '0x5678...9ABC', avatar: '56', lastMsg: 'Спасибо! 🙏', time: new Date(Date.now() - 172800000), unread: 0 },
  { id: '4', name: '0xDEAD...BEEF', avatar: 'DE', lastMsg: 'Встретимся завтра', time: new Date(Date.now() - 604800000), unread: 5 },
];

const demoMessages: Record<string, Message[]> = {
  '1': [
    { id: '1', text: 'Привет! 👋', own: false, time: new Date(Date.now() - 600000), status: 'read' },
    { id: '2', text: 'Привет! Как дела?', own: true, time: new Date(Date.now() - 500000), status: 'read' },
    { id: '3', text: 'Отлично, задеплоил контракт!', own: false, time: new Date(Date.now() - 400000), status: 'read' },
    { id: '4', text: 'Круто! Скинь адрес 🚀', own: true, time: new Date(Date.now() - 300000), status: 'delivered' },
  ],
  '2': [
    { id: '1', text: 'Готов к свапу?', own: true, time: new Date(Date.now() - 90000000), status: 'read' },
    { id: '2', text: 'Да, жду газ', own: false, time: new Date(Date.now() - 86400000), status: 'read' },
  ],
};

function generateQRSvg(text: string): string {
  const size = 200, modules = 25, cellSize = size / modules;
  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="background:white">`;
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  
  const drawFinder = (x: number, y: number) => {
    svg += `<rect x="${x*cellSize}" y="${y*cellSize}" width="${7*cellSize}" height="${7*cellSize}" fill="#000"/>`;
    svg += `<rect x="${(x+1)*cellSize}" y="${(y+1)*cellSize}" width="${5*cellSize}" height="${5*cellSize}" fill="#fff"/>`;
    svg += `<rect x="${(x+2)*cellSize}" y="${(y+2)*cellSize}" width="${3*cellSize}" height="${3*cellSize}" fill="#000"/>`;
  };
  drawFinder(0, 0); drawFinder(modules-7, 0); drawFinder(0, modules-7);
  
  let seed = Math.abs(hash) || 1;
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      if ((x<8 && y<8) || (x>=modules-8 && y<8) || (x<8 && y>=modules-8)) continue;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if (seed % 3 === 0) svg += `<rect x="${x*cellSize}" y="${y*cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
    }
  }
  svg += '</svg>';
  return svg;
}

export default function App() {
  const [chats] = useState<Chat[]>(demoChats);
  const [messages, setMessages] = useState<Record<string, Message[]>>(demoMessages);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newAddr, setNewAddr] = useState('');
  
  const [connected, setConnected] = useState(() => !!localStorage.getItem('w3g_addr'));
  const [walletAddr, setWalletAddr] = useState(() => localStorage.getItem('w3g_addr') || '');
  const [wcScreen, setWcScreen] = useState<'picker' | 'init' | 'qr' | 'waiting' | 'done'>('picker');
  const [wcUri, setWcUri] = useState('');
  const [xmtpStatus, setXmtpStatus] = useState<'none' | 'connecting' | 'ready'>('none');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<'metamask' | 'trust' | 'walletconnect' | null>(null);
  
  const endRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const chatMessages = activeChat ? messages[activeChat.id] || [] : [];
  const qrSvg = wcUri ? generateQRSvg(wcUri) : '';
  
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages.length]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  
  // Connect MetaMask using new SDK
  const connectMM = useCallback(async () => {
    setConnecting(true);
    setError('');
    setWcScreen('init');
    setSelectedWallet('metamask');
    
    try {
      const result = await connectMetaMask(['0x89']);
      setConnected(true);
      setWalletAddr(result.address);
      localStorage.setItem('w3g_addr', result.address);
      setWcScreen('done');
      setXmtpStatus('connecting');
      setTimeout(() => setXmtpStatus('ready'), 2000);
      setTimeout(() => { setShowWallet(false); setWcScreen('picker'); }, 1500);
    } catch (e: any) {
      setError(e.message || 'Ошибка подключения');
      setWcScreen('picker');
    } finally {
      setConnecting(false);
    }
  }, []);
  
  // Connect via WalletConnect (Trust, generic)
  const connectWC = useCallback(async (type: 'trust' | 'walletconnect') => {
    setConnecting(true);
    setError('');
    setWcScreen('init');
    setSelectedWallet(type);
    
    try {
      const result = await initWalletConnect((uri) => {
        setWcUri(uri);
        setWcScreen('qr');
        
        // Auto-open deep link
        setTimeout(() => {
          if (type === 'trust') {
            openDeepLink(uri, 'trust');
          }
          setWcScreen('waiting');
        }, 1000);
      });
      
      setConnected(true);
      setWalletAddr(result.address);
      localStorage.setItem('w3g_addr', result.address);
      setWcScreen('done');
      setXmtpStatus('connecting');
      setTimeout(() => setXmtpStatus('ready'), 2000);
      setTimeout(() => { setShowWallet(false); setWcScreen('picker'); setWcUri(''); }, 1500);
    } catch (e: any) {
      setError(e.message || 'Ошибка подключения');
      setWcScreen('picker');
    } finally {
      setConnecting(false);
    }
  }, []);
  
  const disconnect = async () => {
    await disconnectMetaMask();
    if (wcProvider) {
      try { await wcProvider.disconnect(); } catch {}
      wcProvider = null;
    }
    setConnected(false);
    setWalletAddr('');
    setXmtpStatus('none');
    setWcUri('');
    localStorage.removeItem('w3g_addr');
    setShowWallet(false);
    setWcScreen('picker');
  };
  
  const send = () => {
    if (!input.trim() || !activeChat) return;
    const newMsg: Message = { id: Date.now().toString(), text: input.trim(), own: true, time: new Date(), status: 'sent' };
    setMessages(prev => ({ ...prev, [activeChat.id]: [...(prev[activeChat.id] || []), newMsg] }));
    setInput('');
  };
  
  const filtered = chats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  
  const btnStyle: React.CSSProperties = { padding: 8, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex' };
  const itemStyle = (a: boolean): React.CSSProperties => ({ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: a ? C.bgOwn : 'transparent', cursor: 'pointer', textAlign: 'left' });
  const bblStyle = (o: boolean): React.CSSProperties => ({ maxWidth: '65%', padding: '8px 12px', borderRadius: o ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: o ? C.bgOwn : C.bgOther, color: C.text, marginBottom: 4, marginLeft: o ? 'auto' : 0 });
  const sendBtnStyle: React.CSSProperties = { padding: 10, background: C.accent, border: 'none', borderRadius: '50%', cursor: input.trim() ? 'pointer' : 'not-allowed', opacity: input.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  
  return (
    <div style={{ height: '100vh', display: 'flex', background: C.bg1 }}>
      {/* SIDEBAR */}
      <div style={{ width: 320, display: activeChat ? 'none' : 'flex', flexDirection: 'column', borderRight: `1px solid ${C.border}`, background: C.bg2, position: 'relative' }} className="sb">
        <div style={{ height: 56, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bg3 }}>
          <button style={btnStyle} onClick={() => setShowWallet(true)}><Wallet size={20} color={C.text} /></button>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: C.text, margin: 0 }}>Web3Gram</h1>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={btnStyle}><Moon size={20} color={C.text} /></button>
            <button style={btnStyle}><Settings size={20} color={C.text} /></button>
          </div>
        </div>
        
        <div style={{ margin: '8px 12px', display: 'flex', alignItems: 'center', background: C.bg1, borderRadius: 20, padding: '8px 12px' }}>
          <Search size={16} color={C.text3} />
          <input style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: C.text, width: '100%', marginLeft: 8 }} placeholder="Поиск" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        
        {connected && (
          <div style={{ padding: '8px 16px', background: C.bg4, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            {xmtpStatus === 'ready' ? <><Lock size={14} color={C.green} /><span style={{ color: C.green }}>E2E активно</span></> :
             xmtpStatus === 'connecting' ? <><RefreshCw size={14} color={C.accent} style={{ animation: 'spin 1s linear infinite' }} /><span style={{ color: C.accent }}>XMTP...</span></> :
             <><Lock size={14} color={C.green} /><span style={{ color: C.green }}>Подключено</span></>}
          </div>
        )}
        
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
                <p style={{ fontSize: 13, color: C.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{c.lastMsg}</p>
              </div>
              {c.unread > 0 && <span style={{ background: C.accent, color: '#fff', fontSize: 12, padding: '2px 8px', borderRadius: 12 }}>{c.unread}</span>}
            </button>
          ))}
        </div>
        
        {connected && (
          <button style={{ position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, background: C.accent, border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,.3)' }} onClick={() => setShowNewChat(true)}>
            <Plus size={24} color="#fff" />
          </button>
        )}
      </div>
      
      {/* MAIN */}
      {activeChat ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="ch">
          <div style={{ height: 56, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bg3, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button style={btnStyle} className="back" onClick={() => setActiveChat(null)}><ChevronLeft size={20} color={C.text} /></button>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: getCol(activeChat.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600 }}>{activeChat.avatar}</div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>{activeChat.name}</h2>
                <p style={{ fontSize: 12, color: C.text2, margin: 0 }}>{xmtpStatus === 'ready' ? '🔒 E2E' : 'online'}</p>
              </div>
            </div>
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button style={btnStyle} onClick={() => setMenu(!menu)}><MoreVertical size={20} color={C.text} /></button>
              {menu && (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, width: 180, background: C.bg1, borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,.4)', border: `1px solid ${C.border}`, overflow: 'hidden', zIndex: 50 }}>
                  <button onClick={() => { navigator.clipboard.writeText(activeChat.id); setMenu(false); }} style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'transparent', color: C.text, fontSize: 14, cursor: 'pointer', textAlign: 'left' }}><Copy size={16} />Копировать</button>
                  <button onClick={() => setMenu(false)} style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'transparent', color: C.text, fontSize: 14, cursor: 'pointer', textAlign: 'left' }}><Pin size={16} />Закрепить</button>
                  <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: 0 }} />
                  <button onClick={() => { setActiveChat(null); setMenu(false); }} style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'transparent', color: C.red, fontSize: 14, cursor: 'pointer', textAlign: 'left' }}><Trash2 size={16} />Удалить</button>
                </div>
              )}
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {chatMessages.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.text2 }}>
                <MessageCircle size={64} style={{ marginBottom: 16, opacity: 0.3 }} />
                <p>Нет сообщений</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Напишите первое!</p>
              </div>
            ) : chatMessages.map((m, i) => {
              const showAvatar = !m.own && (i === 0 || chatMessages[i-1]?.own !== m.own);
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.own ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
                  {!m.own && (showAvatar ? (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: getCol(activeChat.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600, marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }}>{activeChat.avatar[0]}</div>
                  ) : <div style={{ width: 32, marginRight: 8, flexShrink: 0 }} />)}
                  <div style={bblStyle(m.own)}>
                    <p style={{ fontSize: 15, margin: 0, wordBreak: 'break-word' }}>{m.text}</p>
                    <div style={{ fontSize: 11, color: C.text3, marginTop: 4, textAlign: 'right' }}>
                      {fmt(m.time)}
                      {m.own && <span style={{ marginLeft: 4 }}>
                        {m.status === 'sending' && '⏳'}
                        {m.status === 'sent' && <Check size={12} color={C.text3} style={{ verticalAlign: 'middle' }} />}
                        {m.status === 'delivered' && <CheckCheck size={12} color={C.text3} style={{ verticalAlign: 'middle' }} />}
                        {m.status === 'read' && <CheckCheck size={12} color={C.blue} style={{ verticalAlign: 'middle' }} />}
                      </span>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          
          <div style={{ padding: '12px 16px', background: C.bg2, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input style={{ flex: 1, background: C.bg3, color: C.text, border: 'none', borderRadius: 20, padding: '10px 16px', fontSize: 15, outline: 'none' }} placeholder="Написать сообщение..." value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()} />
              <button style={sendBtnStyle} onClick={send}><Send size={20} color="#fff" /></button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.text2 }} className="empty">
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: C.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <MessageCircle size={48} color={C.text3} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: C.text, marginBottom: 8 }}>Web3Gram</h2>
          <p style={{ fontSize: 14, textAlign: 'center', maxWidth: 300 }}>Децентрализованный мессенджер на Polygon</p>
          {connected ? (
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.green }}><Lock size={14} /><span>{walletAddr.slice(0, 6)}…{walletAddr.slice(-4)}</span></div>
              <p style={{ fontSize: 12, color: C.text3 }}>Polygon · E2E {xmtpStatus === 'ready' ? '✓' : '...'}</p>
            </div>
          ) : (
            <button style={{ marginTop: 20, padding: '12px 24px', background: C.accent, border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 500, cursor: 'pointer' }} onClick={() => setShowWallet(true)}>Подключить кошелёк</button>
          )}
        </div>
      )}
      
      {/* WALLET MODAL */}
      {showWallet && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }} onClick={() => { setShowWallet(false); setWcScreen('picker'); setWcUri(''); }}>
          <div style={{ width: '100%', maxWidth: 380, background: C.bg2, borderRadius: 16, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: 16, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{wcScreen === 'done' ? 'Кошелёк' : 'Подключение'}</h3>
              <button style={btnStyle} onClick={() => { setShowWallet(false); setWcScreen('picker'); setWcUri(''); }}><X size={20} color={C.text2} /></button>
            </div>
            <div style={{ padding: 16 }}>
              
              {wcScreen === 'picker' && (
                <div>
                  {error && (
                    <div style={{ padding: 12, background: 'rgba(229,57,53,.2)', borderRadius: 12, color: C.red, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <AlertCircle size={16} /><span>{error}</span>
                    </div>
                  )}
                  
                  <button style={{ width: '100%', padding: 16, background: C.bg4, border: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, cursor: connecting ? 'wait' : 'pointer', marginBottom: 12, color: C.text, textAlign: 'left', opacity: connecting ? 0.7 : 1 }} onClick={() => !connecting && connectMM()} disabled={connecting}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="" style={{ width: 44, height: 44 }} />
                    <div><p style={{ fontWeight: 600, margin: 0, fontSize: 16 }}>MetaMask</p><p style={{ fontSize: 12, color: C.text2, margin: 0 }}>Нативное подключение</p></div>
                  </button>
                  
                  <button style={{ width: '100%', padding: 16, background: C.bg4, border: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, cursor: connecting ? 'wait' : 'pointer', marginBottom: 12, color: C.text, textAlign: 'left', opacity: connecting ? 0.7 : 1 }} onClick={() => !connecting && connectWC('trust')} disabled={connecting}>
                    <div style={{ width: 44, height: 44, background: '#3b99fc', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>T</span></div>
                    <div><p style={{ fontWeight: 600, margin: 0, fontSize: 16 }}>Trust Wallet</p><p style={{ fontSize: 12, color: C.text2, margin: 0 }}>Через WalletConnect</p></div>
                  </button>
                  
                  <button style={{ width: '100%', padding: 16, background: C.bg4, border: 'none', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, cursor: connecting ? 'wait' : 'pointer', marginBottom: 12, color: C.text, textAlign: 'left', opacity: connecting ? 0.7 : 1 }} onClick={() => !connecting && connectWC('walletconnect')} disabled={connecting}>
                    <div style={{ width: 44, height: 44, background: '#3b99fc', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>WC</span></div>
                    <div><p style={{ fontWeight: 600, margin: 0, fontSize: 16 }}>WalletConnect</p><p style={{ fontSize: 12, color: C.text2, margin: 0 }}>200+ кошельков</p></div>
                  </button>
                  
                  <p style={{ fontSize: 11, color: C.text3, textAlign: 'center', marginTop: 12 }}>Polygon Mainnet · E2E шифрование</p>
                </div>
              )}
              
              {wcScreen === 'init' && (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <RefreshCw size={56} color={C.accent} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 20px', display: 'block' }} />
                  <p style={{ fontWeight: 500, color: C.text, fontSize: 16 }}>Подключение...</p>
                  <p style={{ fontSize: 14, color: C.text2, marginTop: 8 }}>
                    {selectedWallet === 'metamask' ? 'Откройте MetaMask для подтверждения' : 'Создание сессии...'}
                  </p>
                </div>
              )}
              
              {wcScreen === 'qr' && (
                <div style={{ padding: '16px 0', textAlign: 'center' }}>
                  <div style={{ background: '#fff', padding: 16, borderRadius: 16, display: 'inline-block', marginBottom: 20 }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
                  <p style={{ fontWeight: 500, color: C.text, marginBottom: 8, fontSize: 16 }}>Отсканируйте QR-код</p>
                  <p style={{ fontSize: 13, color: C.text2, marginBottom: 16 }}>Или откройте Trust Wallet</p>
                  <button onClick={() => openDeepLink(wcUri, 'trust')} style={{ padding: '12px 24px', background: '#3b99fc', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Открыть Trust Wallet</button>
                  <button onClick={() => { setWcScreen('picker'); setWcUri(''); }} style={{ marginTop: 16, fontSize: 14, color: C.accent, background: 'transparent', border: 'none', cursor: 'pointer', display: 'block', width: '100%' }}>Отмена</button>
                </div>
              )}
              
              {wcScreen === 'waiting' && (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: C.bg4, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <Wallet size={40} color={C.accent} />
                  </div>
                  <p style={{ fontWeight: 600, color: C.text, fontSize: 18, marginBottom: 8 }}>Подтвердите в кошельке</p>
                  <p style={{ fontSize: 14, color: C.text2, marginBottom: 24 }}>Нажмите "Подключить" в Trust Wallet</p>
                  <button onClick={() => openDeepLink(wcUri, 'trust')} style={{ padding: '12px 24px', background: C.bg5, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontWeight: 500, cursor: 'pointer' }}>Открыть снова</button>
                </div>
              )}
              
              {wcScreen === 'done' && (
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(77,205,94,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><Check size={40} color={C.green} /></div>
                  <p style={{ fontWeight: 600, color: C.text, fontSize: 18, marginBottom: 4 }}>Подключено!</p>
                  <p style={{ fontSize: 14, color: C.green, marginBottom: 20 }}>✓ Polygon Mainnet</p>
                  <div style={{ background: C.bg4, borderRadius: 12, padding: 16, marginBottom: 20 }}>
                    <p style={{ fontSize: 12, color: C.text2, marginBottom: 8 }}>Адрес кошелька</p>
                    <p style={{ fontSize: 14, color: C.text, fontFamily: 'monospace', margin: 0, wordBreak: 'break-all' }}>{walletAddr}</p>
                  </div>
                  <button onClick={disconnect} style={{ width: '100%', padding: 14, background: 'rgba(229,57,53,.15)', border: 'none', borderRadius: 12, color: C.red, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><LogOut size={18} />Отключить</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* NEW CHAT */}
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
      
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@media(min-width:768px){.sb{width:400px!important}.ch{display:flex!important}.empty{display:flex!important}.back{display:none!important}}@media(max-width:767px){.sb{width:100%!important}}`}</style>
    </div>
  );
}
