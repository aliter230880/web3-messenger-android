import { useState } from 'react';
import { useAppStore } from '../store';
import { isValidEthAddress, shortenAddress } from '../utils/helpers';
import { X, Search, UserPlus, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function NewChatModal() {
  const isOpen = useAppStore((s) => s.isNewChatOpen);
  const toggleNewChat = useAppStore((s) => s.toggleNewChat);
  const upsertChat = useAppStore((s) => s.upsertChat);
  const setActiveChat = useAppStore((s) => s.setActiveChat);
  const chats = useAppStore((s) => s.chats);
  const wallet = useAppStore((s) => s.wallet);

  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const handleStartChat = () => {
    setError('');

    if (!address.trim()) {
      setError('Введите Ethereum адрес');
      return;
    }

    if (!isValidEthAddress(address.trim())) {
      setError('Введите корректный адрес (0x...)');
      return;
    }

    const addr = address.trim().toLowerCase();

    if (addr === wallet.address?.toLowerCase()) {
      setError('Нельзя начать чат с самим собой');
      return;
    }

    // Check if chat already exists
    const existing = chats.find((c) => c.id === addr);
    if (existing) {
      setActiveChat(addr);
      toggleNewChat();
      setAddress('');
      return;
    }

    const shortAddr = shortenAddress(address.trim());
    const now = new Date();

    upsertChat({
      id: addr,
      type: 'private',
      name: shortAddr,
      avatar: address.trim().slice(2, 4).toUpperCase(),
      participants: [{
        id: address.trim(),
        name: shortAddr,
        walletAddress: address.trim(),
        isOnline: false,
      }],
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      createdAt: now,
      updatedAt: now,
    });

    setActiveChat(addr);
    toggleNewChat();
    setAddress('');
  };

  const handleClose = () => {
    toggleNewChat();
    setAddress('');
    setError('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-[#17212b] rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-tg-text dark:text-tg-text-dark">
                  Новый чат
                </h2>
                <button
                  onClick={handleClose}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <X className="w-5 h-5 text-tg-secondary" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="text-sm text-tg-secondary dark:text-tg-secondary-dark mb-2 block">
                    Ethereum адрес собеседника
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tg-secondary" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => { setAddress(e.target.value); setError(''); }}
                      placeholder="0x..."
                      className="w-full pl-11 pr-4 py-3 bg-gray-100 dark:bg-[#242f3d] rounded-xl text-sm text-tg-text dark:text-tg-text-dark placeholder-tg-secondary outline-none focus:ring-2 focus:ring-tg-blue/30 font-mono"
                      onKeyDown={(e) => e.key === 'Enter' && handleStartChat()}
                    />
                  </div>
                </div>

                <p className="text-xs text-tg-secondary dark:text-tg-secondary-dark">
                  Введите полный Ethereum адрес для создания зашифрованного чата.
                  Собеседник должен использовать Web3Gram или совместимый мессенджер.
                </p>

                <button
                  onClick={handleStartChat}
                  disabled={!address.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-tg-blue hover:bg-tg-blue-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                >
                  <UserPlus className="w-5 h-5" />
                  Начать чат
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
