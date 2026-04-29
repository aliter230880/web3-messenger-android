import { useState } from 'react';
import { Wallet, Shield, Zap, Lock, Globe, ArrowRight, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { connectWallet, getEnsName } from '../utils/wallet';
import { wsClient } from '../utils/ws';

export default function ConnectWallet() {
  const { setWallet, setEns } = useStore();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const result = await connectWallet();
      if (result) {
        const { address, network } = result;
        setWallet(address, network);
        const ens = await getEnsName(address);
        if (ens) setEns(ens);
        wsClient.connect(address);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка подключения';
      setError(msg);
    } finally {
      setConnecting(false);
    }
  };

  const handleDemo = () => {
    setDemoMode(true);
    setTimeout(() => {
      const demoAddress = '0x742d35Cc6634C0532925a3b8D4C9B7F3c5A2b8E9';
      setWallet(demoAddress, 'Ethereum Mainnet');
      setEns('demo.eth');
      wsClient.connect(demoAddress);
    }, 800);
  };



  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-600/5 rounded-full blur-2xl" />
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-600 to-blue-600 mb-4 shadow-2xl shadow-purple-500/30">
            <Globe className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Web3 Messenger</h1>
          <p className="text-gray-400 text-sm">
            Децентрализованный мессенджер<br />с E2E шифрованием
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Lock, label: 'E2E шифрование', color: 'from-purple-500 to-purple-700' },
            { icon: Shield, label: 'Без серверов', color: 'from-blue-500 to-blue-700' },
            { icon: Zap, label: 'Быстро', color: 'from-indigo-500 to-indigo-700' },
          ].map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center backdrop-blur-sm"
            >
              <div
                className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${color} mb-2`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-gray-300 text-xs font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Connect button */}
        <div className="space-y-3">
          <button
            onClick={handleConnect}
            disabled={connecting || demoMode}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {connecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Подключение...</span>
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                <span>Подключить MetaMask</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </>
            )}
          </button>

          <button
            onClick={handleDemo}
            disabled={connecting || demoMode}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-semibold rounded-2xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {demoMode ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Загрузка демо...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 text-yellow-400" />
                <span>Демо-режим</span>
                <span className="ml-auto text-xs text-gray-500">Без кошелька</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm text-center">{error}</p>
            <button
              onClick={handleDemo}
              className="mt-2 w-full text-xs text-red-300 hover:text-white underline"
            >
              Попробовать демо-режим
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 flex items-center justify-center gap-6 text-center">
          {[
            { value: '100%', label: 'Приватность' },
            { value: 'E2E', label: 'Шифрование' },
            { value: '0', label: 'Серверов' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-white font-bold text-lg">{value}</div>
              <div className="text-gray-500 text-xs">{label}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Ваши сообщения зашифрованы и хранятся<br />только у вас и вашего собеседника
        </p>
      </div>
    </div>
  );
}
