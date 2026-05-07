import { useState, useEffect } from 'react';
import { useAppStore } from './store';
import { ChatList } from './components/ChatList';
import { ChatView } from './components/ChatView';
import { SettingsPanel } from './components/SettingsPanel';
import { WalletModal } from './components/WalletModal';
import { NewChatModal } from './components/NewChatModal';
import { getDemoChats } from './services/demoService';

import { shortenAddress } from './utils/helpers';
import { Menu, Search, Edit3, Wallet, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';

export default function App() {
  const {
    setActiveChat,
    toggleSettings, toggleWalletModal, toggleNewChat,
    searchQuery, setSearchQuery,
    wallet, setWallet, setCurrentUser, setChats,
  } = useAppStore();

  const [showMobileList, setShowMobileList] = useState(true);

  // Initialize demo data if wallet connected but no chats
  useEffect(() => {
    if (wallet.isConnected) {
      const chats = useAppStore.getState().chats;
      if (chats.length === 0) {
        setChats(getDemoChats());
      }
    }
  }, [wallet.isConnected, setChats]);

  // Auto-connect ONLY if we're inside a wallet browser (MetaMask/Trust in-app)
  useEffect(() => {
    if (wallet.isConnected) return;
    
    const ethereum = (window as any).ethereum;
    // Только если есть injected provider И это мобильный браузер кошелька
    if (!ethereum) return;
    
    // Проверяем что это именно браузер кошелька, а не desktop extension
    const isWalletBrowser = ethereum.isMetaMask || ethereum.isTrust;
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    
    if (!isWalletBrowser || !isMobile) return;

    // Auto-connect
    const doConnect = async () => {
      try {
        const provider = new ethers.providers.Web3Provider(ethereum, 'any');
        const accounts = await provider.send('eth_requestAccounts', []);
        if (accounts?.length > 0) {
          const address = accounts[0];
          setWallet({ isConnected: true, address, chainId: 137 });
          setCurrentUser({
            id: 'current',
            name: shortenAddress(address),
            avatar: address.slice(2, 4).toUpperCase(),
            walletAddress: address,
            isOnline: true,
          });
          if (useAppStore.getState().chats.length === 0) {
            setChats(getDemoChats());
          }
        }
      } catch (e) {
        console.log('Auto-connect skipped:', e);
      }
    };

    setTimeout(doConnect, 300);
  }, [wallet.isConnected, setWallet, setCurrentUser, setChats]);

  const handleChatSelect = (chatId: string) => {
    setActiveChat(chatId);
    setShowMobileList(false);
  };

  const handleBack = () => {
    setActiveChat(null);
    setShowMobileList(true);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f1f1f1] dark:bg-[#0e1621] transition-colors">
      <div className="h-full w-full flex flex-col lg:flex-row">
        {/* Sidebar */}
        <div className={`${showMobileList ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-[420px] max-w-full bg-white dark:bg-[#17212b] border-r border-gray-200 dark:border-gray-700/50 overflow-hidden relative`}>
          {/* Header */}
          <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#17212b] z-10">
            <button onClick={toggleSettings} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors" title="Меню">
              <Menu className="w-6 h-6 text-tg-secondary dark:text-tg-secondary-dark" />
            </button>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-100 dark:bg-[#242f3d] hover:bg-gray-200 dark:hover:bg-[#2b3a4a] focus:bg-white dark:focus:bg-[#242f3d] focus:ring-2 focus:ring-tg-blue/30 rounded-full text-sm text-tg-text dark:text-tg-text-dark placeholder-gray-500 transition-all outline-none"
              />
            </div>
          </div>

          {/* Chat List */}
          <ChatList onChatSelect={handleChatSelect} />

          {/* Bottom wallet area */}
          {!wallet.isConnected && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#17212b]">
              <button
                onClick={toggleWalletModal}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-tg-blue hover:bg-tg-blue-dark text-white text-sm font-medium transition-colors shadow-md shadow-tg-blue/20"
              >
                <Wallet className="w-5 h-5" />
                Подключить кошелёк
              </button>
            </div>
          )}

          {wallet.isConnected && (
            <button
              onClick={toggleWalletModal}
              className="flex items-center gap-2.5 px-4 py-3 border-t border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors bg-white dark:bg-[#17212b]"
            >
              <div className="w-8 h-8 rounded-full bg-tg-green/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-tg-green" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-medium text-tg-text dark:text-tg-text-dark truncate">
                  {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                </p>
                <p className="text-[11px] text-tg-secondary dark:text-tg-secondary-dark">
                  Polygon · E2E
                </p>
              </div>
              <Zap className="w-4 h-4 text-tg-green flex-shrink-0" />
            </button>
          )}

          {/* FAB for new chat */}
          {wallet.isConnected && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleNewChat}
              className="absolute bottom-20 right-5 w-14 h-14 bg-tg-blue hover:bg-tg-blue-dark rounded-full shadow-lg flex items-center justify-center text-white z-10"
              title="Новый чат"
            >
              <Edit3 className="w-6 h-6" />
            </motion.button>
          )}
        </div>

        {/* Chat Area */}
        <div className={`${showMobileList ? 'hidden' : 'flex'} lg:flex flex-1 min-w-0 relative`}>
          <ChatView onBack={handleBack} />
        </div>
      </div>

      {/* Modals */}
      <SettingsPanel />
      <WalletModal />
      <NewChatModal />
    </div>
  );
}
