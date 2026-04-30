import { useState } from 'react';
import { X, Wallet, Copy, Check, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store';
import { useWeb3Messenger } from '../hooks/useWeb3Messenger';
import { motion, AnimatePresence } from 'framer-motion';

export function WalletModal() {
  const { isWalletModalOpen, toggleWalletModal } = useAppStore();
  const { connect, disconnect, isConnecting, isConnected, address } = useWeb3Messenger();
  const [copied, setCopied] = useState(false);

  const handleConnect = async () => {
    try {
      await connect();
      toggleWalletModal();
    } catch (error) {
      console.error('Ошибка подключения:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toggleWalletModal();
    } catch (error) {
      console.error('Ошибка отключения:', error);
    }
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
            className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <button
                onClick={toggleWalletModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900">
                Кошелёк Web3
              </h2>
              <button
                onClick={toggleWalletModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              {isConnected ? (
                <div className="space-y-6">
                  {/* Connected State */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 mb-4">
                      <Check className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      Подключено
                    </h3>
                    <p className="text-gray-500 font-mono text-sm">
                      {address?.slice(0, 10)}...{address?.slice(-8)}
                    </p>
                    <p className="text-xs text-emerald-600 mt-2">
                      ✓ XMTP готов • ✓ Контракты готовы
                    </p>
                  </div>

                  {/* Address Card */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-sm text-gray-500 mb-2">Адрес кошелька</p>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-mono text-gray-700 bg-white px-3 py-2 rounded-lg flex-1 text-center">
                        {address?.slice(0, 10)}...{address?.slice(-8)}
                      </code>
                      <button
                        onClick={copyAddress}
                        className="p-2.5 hover:bg-gray-200 rounded-xl transition-colors"
                      >
                        {copied ? (
                          <Check className="w-5 h-5 text-[#00c73e]" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Disconnect Button */}
                  <button
                    onClick={handleDisconnect}
                    className="w-full py-3.5 px-4 bg-red-50 hover:bg-red-100 text-red-500 font-medium rounded-2xl transition-colors"
                  >
                    Отключить кошелёк
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Connect State */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#3390ec] to-[#1a73e8] mb-4">
                      <Wallet className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Подключить кошелёк
                    </h3>
                    <p className="text-gray-500 max-w-xs mx-auto">
                      Подключите криптокошелёк для использования Web3 функций
                    </p>
                  </div>

                  {/* Wallet Options */}
                  <div className="space-y-3">
                    <button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-[#3390ec] hover:bg-[#2b7ecc] text-white font-medium rounded-2xl transition-colors disabled:opacity-50"
                    >
                      {isConnecting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Подключение...
                        </>
                      ) : (
                        <>
                          <Wallet className="w-5 h-5" />
                          Подключить MetaMask
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-2xl transition-colors disabled:opacity-50"
                    >
                      <Wallet className="w-5 h-5" />
                      WalletConnect
                    </button>

                    <button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-2xl transition-colors disabled:opacity-50"
                    >
                      <Wallet className="w-5 h-5" />
                      Coinbase Wallet
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
