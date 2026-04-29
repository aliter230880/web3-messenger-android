import { useState } from 'react';
import { Shield, Wallet, Zap, Lock } from 'lucide-react';
import { connectWallet, formatAddress } from '../lib/web3';
import { useStore } from '../store/useStore';

export function LoginScreen() {
  const { setWallet, setUser, setIsConnecting, isConnecting } = useStore();
  const [error, setError] = useState('');
  const [_step, setStep] = useState<'landing' | 'connecting'>('landing');

  const handleConnect = async () => {
    setError('');
    setIsConnecting(true);
    setStep('connecting');
    try {
      const wallet = await connectWallet();
      setWallet(wallet);
      setUser({
        address: wallet.address,
        name: formatAddress(wallet.address, 4),
        isOnline: true,
      });
    } catch (err: unknown) {
      const e = err as Error;
      if (e.message?.includes('not installed') || e.message?.includes('No wallet')) {
        setError('MetaMask is not installed. Please install it to continue.');
      } else if (e.message?.includes('rejected') || e.message?.includes('denied')) {
        setError('Connection rejected. Please approve the connection in your wallet.');
      } else {
        // Demo mode without wallet
        const demoAddress = '0x' + Math.random().toString(16).slice(2, 42).padEnd(40, '0');
        setWallet({
          address: demoAddress,
          balance: '1.2345',
          chainId: 1,
          networkName: 'Ethereum',
        });
        setUser({
          address: demoAddress,
          name: formatAddress(demoAddress, 4),
          isOnline: true,
        });
      }
      setIsConnecting(false);
      setStep('landing');
    }
    setIsConnecting(false);
  };

  const handleDemoMode = () => {
    const demoAddress = '0x' + Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    setWallet({
      address: demoAddress,
      balance: '2.7182',
      chainId: 1,
      networkName: 'Ethereum',
    });
    setUser({
      address: demoAddress,
      name: formatAddress(demoAddress, 4),
      isOnline: true,
    });
  };

  return (
    <div className="min-h-screen bg-[#17212b] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[#2aabee]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-[#2aabee]/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#2aabee]/3 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#2aabee] to-[#1e96c8] flex items-center justify-center shadow-2xl shadow-[#2aabee]/30 mb-6">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M24 4L44 14V34L24 44L4 34V14L24 4Z" fill="white" fillOpacity="0.15"/>
              <path d="M8 16l16 8 16-8" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M24 24v16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="24" cy="16" r="6" fill="white"/>
              <circle cx="8" cy="32" r="4" fill="white" fillOpacity="0.7"/>
              <circle cx="40" cy="32" r="4" fill="white" fillOpacity="0.7"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Web3 Messenger</h1>
          <p className="text-[#8899a8] text-center text-sm leading-relaxed">
            The fastest & most secure<br />decentralized messenger
          </p>
        </div>

        {/* Features */}
        <div className="w-full grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Lock, label: 'E2E Encrypted', color: '#4dcd5e' },
            { icon: Zap, label: 'Lightning Fast', color: '#f0a500' },
            { icon: Shield, label: 'Web3 Native', color: '#2aabee' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="bg-[#1e2c3a] rounded-2xl p-3 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: color + '22' }}>
                <Icon size={18} style={{ color }} />
              </div>
              <span className="text-[#8899a8] text-xs text-center font-medium leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* Connect Button */}
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full py-4 rounded-2xl bg-[#2aabee] hover:bg-[#1e96c8] active:bg-[#1a7fb0] transition-all duration-150 text-white font-semibold text-lg shadow-lg shadow-[#2aabee]/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mb-3"
        >
          {isConnecting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Wallet size={20} />
              <span>Connect Wallet</span>
            </>
          )}
        </button>

        <button
          onClick={handleDemoMode}
          className="w-full py-3 rounded-2xl border border-[#2a3a4a] hover:bg-[#1e2c3a] active:bg-[#243040] transition-all duration-150 text-[#8899a8] hover:text-white font-medium text-base flex items-center justify-center gap-2"
        >
          <span>Try Demo Mode</span>
        </button>

        {error && (
          <div className="mt-4 w-full p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Bottom hint */}
        <p className="mt-8 text-[#6c7c8c] text-xs text-center leading-relaxed">
          By connecting you agree to our terms.<br />
          Your keys, your messages. 🔐
        </p>
      </div>
    </div>
  );
}
