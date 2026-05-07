import { useAppStore } from '../store';
import { Avatar } from './Avatar';
import { shortenAddress } from '../utils/helpers';
import {
  X, Moon, Sun, User, Bell, Lock, HelpCircle,
  LogOut, Shield, Globe, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function SettingsPanel() {
  const isOpen = useAppStore((s) => s.isSettingsOpen);
  const toggleSettings = useAppStore((s) => s.toggleSettings);
  const isDarkMode = useAppStore((s) => s.isDarkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const currentUser = useAppStore((s) => s.currentUser);
  const wallet = useAppStore((s) => s.wallet);
  const setWallet = useAppStore((s) => s.setWallet);

  const handleDisconnect = () => {
    setWallet({ isConnected: false, address: null, chainId: null });
    localStorage.removeItem('w3g_address');
    localStorage.removeItem('w3g_name');
    toggleSettings();
    window.location.reload();
  };

  const menuItems = [
    { icon: User, label: 'Мой профиль', onClick: () => {} },
    { icon: Bell, label: 'Уведомления', onClick: () => {} },
    { icon: Lock, label: 'Приватность', onClick: () => {} },
    { icon: Shield, label: 'Безопасность', badge: 'E2E', onClick: () => {} },
    { icon: Globe, label: 'Язык', badge: 'Русский', onClick: () => {} },
    { icon: HelpCircle, label: 'Помощь', onClick: () => {} },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={toggleSettings}
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed left-0 top-0 bottom-0 w-[300px] max-w-[85vw] bg-white dark:bg-[#17212b] z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="bg-tg-blue dark:bg-[#212d3b] p-4 pb-5">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={toggleSettings}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              <Avatar name={currentUser?.name || 'П'} size="lg" />
              <h3 className="text-white font-semibold mt-3 text-base">
                {currentUser?.name || 'Пользователь'}
              </h3>
              {wallet.isConnected && wallet.address && (
                <p className="text-white/70 text-sm mt-0.5 font-mono">
                  {shortenAddress(wallet.address)}
                </p>
              )}
            </div>

            {/* Theme toggle - БОЛЬШАЯ КНОПКА */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={toggleDarkMode}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isDarkMode ? (
                    <Moon className="w-6 h-6 text-blue-400" />
                  ) : (
                    <Sun className="w-6 h-6 text-amber-500" />
                  )}
                  <div className="text-left">
                    <p className="font-medium">
                      {isDarkMode ? 'Тёмная тема' : 'Светлая тема'}
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Нажмите для переключения
                    </p>
                  </div>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${
                  isDarkMode ? 'bg-blue-500' : 'bg-gray-300'
                }`}>
                  <motion.div
                    className="w-5 h-5 bg-white rounded-full shadow"
                    animate={{ x: isDarkMode ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </div>
              </button>
            </div>

            {/* Menu */}
            <div className="flex-1 overflow-y-auto py-2">
              {/* Wallet status */}
              {wallet.isConnected && (
                <div className="px-4 py-3 mx-3 mb-2 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Polygon Mainnet
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Кошелёк подключён
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <item.icon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  <span className="flex-1 text-left text-sm text-gray-900 dark:text-white">
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span className="text-xs text-tg-blue font-medium">
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              ))}

              <div className="h-px bg-gray-200 dark:bg-gray-700 mx-4 my-2" />

              {wallet.isConnected && (
                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  <LogOut className="w-6 h-6 text-red-500" />
                  <span className="text-sm text-red-500 font-medium">Отключить кошелёк</span>
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Web3Gram v2.0
              </p>
              <p className="text-xs text-gray-400/60 dark:text-gray-600 text-center mt-0.5">
                Decentralized Messenger
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
