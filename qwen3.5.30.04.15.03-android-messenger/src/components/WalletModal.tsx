import { useState } from 'react';
import { X, Copy, Check, ArrowLeft, Smartphone, Globe } from 'lucide-react';
import { useAppStore } from '../store';
import { useWeb3Messenger } from '../hooks/useWeb3Messenger';
import { motion, AnimatePresence } from 'framer-motion';

const MetaMaskIcon = () => (
  <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
    <path d="M36.1 3L22.1 13.3l2.6-6.1L36.1 3z" fill="#E17726" stroke="#E17726" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3.9 3l13.9 10.4-2.5-6.1L3.9 3z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M31 27.1l-3.7 5.7 8 2.2 2.3-7.7-6.6-.2zM2.4 27.3l2.2 7.7 8-2.2-3.7-5.7-6.5.2z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12.2 17.8l-2.2 3.3 7.8.4-.3-8.4-5.3 4.7zM27.8 17.8l-5.4-4.8-.2 8.5 7.8-.4-2.2-3.3zM12.6 32.8l4.7-2.3-4-3.1-.7 5.4zM22.7 30.5l4.7 2.3-.8-5.4-3.9 3.1z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M27.4 32.8l-4.7-2.3.4 3.2-.1 2.9 4.4-5.8zM12.6 32.8l4.4 5.8-.1-2.9.4-3.2-4.7 2.3z" fill="#D5BFB2" stroke="#D5BFB2" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17.1 25.1l-3.9-1.1 2.7-1.3 1.2 2.4zM22.9 25.1l1.2-2.4 2.8 1.3-4 1.1z" fill="#233447" stroke="#233447" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12.6 32.8l.7-5.7-4.4.1 3.7 5.6zM26.7 27.1l.7 5.7 3.7-5.6-4.4-.1zM30.6 21.1l-7.8.4.7 4 1.2-2.4 2.8 1.3 3.1-3.3zM13.2 24l2.8-1.3 1.2 2.4.7-4-7.8-.4 3.1 3.3z" fill="#CC6228" stroke="#CC6228" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 21.1l3.3 6.4-.1-3.2L10 21.1zM26.8 24.3l-.2 3.2 3.3-6.4-3.1 3.2zM17.9 21.5l-.7 4 .9 4.5.2-5.9-.4-2.6zM22.1 21.5l-.4 2.5.2 5.9.9-4.5-.7-3.9z" fill="#E27525" stroke="#E27525" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22.9 25.1l-.9 4.5.7.5 4-3.1.2-3.2-4 1.3zM13.2 24l.1 3.2 4 3.1.7-.5-.9-4.5-3.9-1.3z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23 38.6l.1-2.9-.3-.3h-5.6l-.3.3.1 2.9-4.4-5.8 1.5 1.2 6.2.4 6.2-.4 1.5-1.2L23 38.6z" fill="#C0AC9D" stroke="#C0AC9D" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22.7 30.5l-.7-.5h-4l-.7.5-.4 3.2.3-.3h5.6l.3.3-.4-3.2z" fill="#161616" stroke="#161616" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M36.7 13.9l1.2-5.6L36.1 3l-13.4 10 5 4.2 7.1 2.1 1.6-1.8-.7-.5 1.1-1-.8-.6 1.1-.8-.4-.7zM2.1 8.3l1.2 5.6-.8.6 1.1.8-.8.6 1.1 1-.7.5 1.5 1.8 7.1-2.1 5-4.2L3.9 3 2.1 8.3z" fill="#763E1A" stroke="#763E1A" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M35.8 20l-7.1-2.1 2.2 3.3-3.3 6.4 4.3-.1h6.5L35.8 20zM11.3 17.9L4.2 20l-2.6 7.5h6.5l4.3.1-3.3-6.4 2.2-3.3zM22.8 21.5l.5-8.4 2.1-5.7h-10.7l2.1 5.7.5 8.4.2 2.6v5.9h4l.1-5.9.2-2.6z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const WalletConnectIcon = () => (
  <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
    <rect width="40" height="40" rx="10" fill="#3B99FC"/>
    <path d="M12.5 15.8c4.1-4 10.9-4 15 0l.5.5c.2.2.2.5 0 .7l-1.7 1.7c-.1.1-.3.1-.4 0l-.7-.7c-2.9-2.8-7.5-2.8-10.4 0l-.7.7c-.1.1-.3.1-.4 0l-1.7-1.7c-.2-.2-.2-.5 0-.7l.5-.5zm18.5 3.4l1.5 1.5c.2.2.2.5 0 .7l-6.8 6.6c-.2.2-.5.2-.7 0l-4.8-4.7c-.1-.1-.2-.1-.3 0l-4.8 4.7c-.2.2-.5.2-.7 0L7.5 21.4c-.2-.2-.2-.5 0-.7l1.5-1.5c.2-.2.5-.2.7 0l4.8 4.7c.1.1.2.1.3 0l4.8-4.7c.2-.2.5-.2.7 0l4.8 4.7c.1.1.2.1.3 0l4.8-4.7c.2-.2.5-.2.7 0z" fill="white"/>
  </svg>
);

const TrustWalletIcon = () => (
  <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
    <rect width="40" height="40" rx="10" fill="#3375BB"/>
    <path d="M20 8l10 4.5v9c0 5.5-4.5 10-10 11-5.5-1-10-5.5-10-11v-9L20 8z" fill="white" fillOpacity=".2"/>
    <path d="M20 10.5l8 3.6v7.4c0 4.4-3.6 8-8 8.8-4.4-.8-8-4.4-8-8.8v-7.4l8-3.6z" fill="white"/>
    <path d="M16.5 20l2.5 2.5 5-5" stroke="#3375BB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function WalletModal() {
  const { isWalletModalOpen, toggleWalletModal } = useAppStore();
  const { connect, disconnect, isConnecting, isConnected, address, isMobile, hasMetaMask } = useWeb3Messenger();
  const [copied, setCopied] = useState(false);
  const [connectingType, setConnectingType] = useState<'metamask' | 'walletconnect' | null>(null);

  const handleConnect = async (type: 'metamask' | 'walletconnect') => {
    try {
      setConnectingType(type);
      await connect(type);
      toggleWalletModal();
    } catch (err: any) {
      if (err.message?.includes('Redirect') || err.message?.includes('MetaMask')) return;
      console.error(err);
    } finally {
      setConnectingType(null);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    toggleWalletModal();
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isWalletModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={toggleWalletModal}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 bg-white dark:bg-[#212121] rounded-t-3xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <button onClick={toggleWalletModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isConnected ? 'Кошелёк' : 'Подключить кошелёк'}
              </h2>
              <button onClick={toggleWalletModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <div className="p-6">
              {isConnected ? (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 mb-4">
                      <Check className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Подключено</h3>
                    <p className="text-gray-500 font-mono text-sm">{address?.slice(0, 10)}...{address?.slice(-8)}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                      ✓ Polygon Mainnet
                    </span>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Адрес кошелька</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 px-3 py-2 rounded-lg flex-1 text-center">
                        {address?.slice(0, 10)}...{address?.slice(-8)}
                      </code>
                      <button onClick={copyAddress} className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors">
                        {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-gray-500" />}
                      </button>
                    </div>
                  </div>

                  <button onClick={handleDisconnect} className="w-full py-3.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 font-medium rounded-2xl transition-colors">
                    Отключить кошелёк
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="text-center pb-2">
                    <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">
                      Выберите способ подключения кошелька к Polygon Mainnet
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => handleConnect('metamask')}
                      disabled={isConnecting}
                      className="w-full flex items-center gap-4 py-4 px-5 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800 text-gray-800 dark:text-white font-medium rounded-2xl transition-all disabled:opacity-50 group"
                    >
                      <MetaMaskIcon />
                      <div className="text-left flex-1">
                        <div className="font-semibold">MetaMask</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          {isMobile && !hasMetaMask ? (
                            <><Smartphone className="w-3 h-3" /> Открыть в приложении MetaMask</>
                          ) : hasMetaMask ? (
                            <><Globe className="w-3 h-3" /> Расширение обнаружено</>
                          ) : (
                            <><Globe className="w-3 h-3" /> Браузерное расширение</>
                          )}
                        </div>
                      </div>
                      {connectingType === 'metamask' && (
                        <div className="w-5 h-5 border-2 border-orange-400/30 border-t-orange-500 rounded-full animate-spin" />
                      )}
                    </button>

                    <button
                      onClick={() => handleConnect('walletconnect')}
                      disabled={isConnecting}
                      className="w-full flex items-center gap-4 py-4 px-5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-gray-800 dark:text-white font-medium rounded-2xl transition-all disabled:opacity-50"
                    >
                      <WalletConnectIcon />
                      <div className="text-left flex-1">
                        <div className="font-semibold">WalletConnect</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          MetaMask Mobile, Trust Wallet и другие
                        </div>
                      </div>
                      {connectingType === 'walletconnect' && (
                        <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-500 rounded-full animate-spin" />
                      )}
                    </button>

                    <button
                      onClick={() => handleConnect('walletconnect')}
                      disabled={isConnecting}
                      className="w-full flex items-center gap-4 py-4 px-5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white font-medium rounded-2xl transition-all disabled:opacity-50"
                    >
                      <TrustWalletIcon />
                      <div className="text-left flex-1">
                        <div className="font-semibold">Trust Wallet</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Через WalletConnect</div>
                      </div>
                    </button>
                  </div>

                  <p className="text-xs text-center text-gray-400 px-4">
                    Подключая кошелёк, вы соглашаетесь с условиями использования
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
