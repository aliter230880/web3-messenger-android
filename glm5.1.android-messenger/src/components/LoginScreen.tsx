import { useState } from 'react';
import { Shield, Wallet, Zap, Lock, Globe } from 'lucide-react';
import { connectWallet, formatAddress } from '../lib/web3';
import { useStore } from '../store/useStore';
import { generateMockChats, generateMockMessages, generateMockContacts } from '../lib/mockData';

export function LoginScreen() {
  const { setWallet, setUser, setIsConnecting, setChats, setMessages, setContacts } = useStore();
  const [error, setError] = useState('');
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  const initApp = (address: string, balance: string, chainId: number, networkName: string) => {
    setWallet({ address, balance, chainId, networkName });
    setUser({ address, name: formatAddress(address, 4), isOnline: true });
    const chats = generateMockChats(address);
    setChats(chats);
    chats.forEach((chat) => {
      const msgs = generateMockMessages(chat.id, address);
      if (msgs.length > 0) setMessages(chat.id, msgs);
    });
    setContacts(generateMockContacts());
  };

  const handleConnect = async () => {
    setError('');
    setIsConnecting(true);
    setIsConnectingWallet(true);
    try {
      const wallet = await connectWallet();
      initApp(wallet.address, wallet.balance, wallet.chainId, wallet.networkName);
    } catch (err: unknown) {
      const e = err as Error;
      if (e.message?.includes('not installed') || e.message?.includes('No wallet')) {
        setError('MetaMask не установлен. Установите расширение для продолжения.');
      } else if (e.message?.includes('rejected') || e.message?.includes('denied')) {
        setError('Подключение отклонено. Подтвердите в кошельке.');
      } else {
        const demoAddress = '0x' + Math.random().toString(16).slice(2, 42).padEnd(40, '0');
        initApp(demoAddress, '1.2345', 1, 'Ethereum');
      }
    }
    setIsConnecting(false);
    setIsConnectingWallet(false);
  };

  const handleDemoMode = () => {
    const demoAddress = '0x' + Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    initApp(demoAddress, '2.7182', 1, 'Ethereum');
  };

  return (
    <div className="min-h-screen bg-[#17212b] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#2aabee]/[0.03] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-[320px] flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="w-[120px] h-[120px] rounded-[30px] bg-gradient-to-br from-[#2aabee] to-[#1e96c8] flex items-center justify-center shadow-[0_8px_30px_rgba(42,171,238,0.15)] mb-6">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <path d="M30 8L52 20V40L30 52L8 40V20L30 8Z" fill="white" fillOpacity="0.1" />
              <path d="M30 8L52 20L30 32L8 20L30 8Z" fill="white" fillOpacity="0.06" />
              <circle cx="30" cy="22" r="8" fill="white" />
              <circle cx="11" cy="38" r="4.5" fill="white" fillOpacity="0.6" />
              <circle cx="49" cy="38" r="4.5" fill="white" fillOpacity="0.6" />
              <path d="M20 32l10 5 10-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            </svg>
          </div>
          <h1 className="text-[28px] font-bold text-white mb-1.5 tracking-tight">Web3 Messenger</h1>
          <p className="text-[#8899a8] text-center text-[14px] leading-[20px]">
            Децентрализованный мессенджер<br />нового поколения
          </p>
        </div>

        {/* Features row */}
        <div className="w-full flex items-center justify-center gap-6 mb-10">
          {[
            { icon: Lock, label: 'E2E', color: '#4dcd5e' },
            { icon: Zap, label: 'Быстро', color: '#f0a500' },
            { icon: Shield, label: 'Web3', color: '#2aabee' },
            { icon: Globe, label: 'P2P', color: '#AB6AC8' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: color + '15' }}>
                <Icon size={16} style={{ color }} />
              </div>
              <span className="text-[#6c7c8c] text-[11px] font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="w-full space-y-3">
          <button
            onClick={handleConnect}
            disabled={isConnectingWallet}
            className="w-full h-[50px] rounded-[12px] bg-[#2aabee] hover:bg-[#229ED9] active:bg-[#1a7fb0] transition-all text-white font-semibold text-[16px] shadow-[0_2px_8px_rgba(42,171,238,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
          >
            {isConnectingWallet ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Подключение...</span>
              </>
            ) : (
              <>
                <Wallet size={20} />
                <span>Подключить кошелёк</span>
              </>
            )}
          </button>

          <button
            onClick={handleDemoMode}
            className="w-full h-[46px] rounded-[12px] border border-[#2a3a4a] hover:bg-[#1e2c3a] active:bg-[#243040] transition-all text-[#8899a8] hover:text-white font-medium text-[15px] flex items-center justify-center"
          >
            Демо-режим
          </button>
        </div>

        {error && (
          <div className="mt-4 w-full p-3 bg-[#e25555]/10 rounded-[10px] animate-fade-in">
            <p className="text-[#e25555] text-[13px] text-center">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 flex items-center gap-1.5">
          <div className="w-[5px] h-[5px] rounded-full bg-[#4dcd5e]" />
          <span className="text-[#5a6a7a] text-[12px]">Aliterra · chat.aliterra.space</span>
        </div>
      </div>
    </div>
  );
}
