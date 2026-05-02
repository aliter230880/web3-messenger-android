import { useState, useEffect } from 'react';
import { Menu, Search, Edit3, Wallet } from 'lucide-react';
import { useAppStore } from './store';
import { ChatList } from './components/ChatList';
import { ChatView } from './components/ChatView';
import { SettingsPanel } from './components/SettingsPanel';
import { WalletModal } from './components/WalletModal';
import { NewChatModal } from './components/NewChatModal';
import { AvatarSelector } from './components/AvatarSelector';
import { useWeb3Messenger } from './hooks/useWeb3Messenger';

export default function App() {
  const { activeChatId, setActiveChat, toggleSettings, toggleWalletModal } = useAppStore();
  const isAvatarSelectorOpen = useAppStore((state) => state.isAvatarSelectorOpen);
  const toggleAvatarSelector = useAppStore((state) => state.toggleAvatarSelector);
  const setAvatar = useAppStore((state) => state.setAvatar);
  const { isConnecting, isConnected, address, connectAliTerra } = useWeb3Messenger();
  const [showMobileList, setShowMobileList] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);

  // ── AliTerra Wallet redirect-back callback (Capacitor mode) ────────────────
  // wallet.aliterra.space redirects back with ?w3g_addr=0x... after unlock.
  // We detect it on mount, auto-connect, and clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const w3gAddr = params.get('w3g_addr');
    if (w3gAddr && w3gAddr.startsWith('0x') && w3gAddr.length >= 42) {
      // Strip ?w3g_addr from URL immediately
      const clean = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', clean);
      // Auto-connect as AliTerra read-only
      connectAliTerra(w3gAddr).catch(console.error);
    }
  }, []); // run once on mount

  const handleChatSelect = (chatId: string) => {
    setActiveChat(chatId);
    setShowMobileList(false);
  };

  const handleBack = () => {
    setActiveChat(null);
    setShowMobileList(true);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f1f1f1] dark:bg-[#0f0f0f] transition-colors">
      <div className="h-full w-full flex flex-col lg:flex-row">
        {/* Sidebar - Chat List */}
        <div
          className={`${
            showMobileList ? 'flex' : 'hidden'
          } lg:flex flex-col w-full lg:w-[420px] max-w-full bg-white dark:bg-[#212121] border-r border-gray-300 dark:border-gray-700 overflow-hidden`}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-2.5 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={toggleSettings}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск"
                className="w-full pl-11 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-[#3390ec] rounded-full text-gray-900 dark:text-white placeholder-gray-500 transition-all outline-none"
              />
            </div>

            <button
              onClick={() => setShowNewChat(true)}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <Edit3 className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>

            <button
              onClick={toggleWalletModal}
              disabled={isConnecting}
              className={`p-2.5 rounded-full transition-colors disabled:opacity-50 ${
                isConnected
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-[#3390ec] hover:bg-[#2b7ecc] text-white'
              }`}
              title={
                isConnected
                  ? `${address?.slice(0, 6)}...${address?.slice(-4)}`
                  : 'Подключить кошелёк'
              }
            >
              {isConnecting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Wallet className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Chat List */}
          <ChatList onChatSelect={handleChatSelect} />
        </div>

        {/* Chat View */}
        <div
          className={`${
            showMobileList ? 'hidden' : 'flex'
          } lg:flex flex-1 flex-col min-w-0 overflow-hidden`}
        >
          {activeChatId ? (
            <ChatView chatId={activeChatId} onBack={handleBack} />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#8e9db6] dark:bg-[#0f0f0f]">
              <div className="text-center p-8">
                <div className="inline-flex items-center justify-center w-28 h-28 mx-auto mb-6 rounded-full bg-black/10 dark:bg-white/10">
                  <svg className="w-14 h-14 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="inline-block px-4 py-1.5 bg-black/20 dark:bg-white/20 rounded-full">
                  <span className="text-white/70 text-sm font-medium">
                    Выберите чат для начала общения
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <SettingsPanel />
      <WalletModal />
      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      <AvatarSelector
        isOpen={isAvatarSelectorOpen}
        onClose={toggleAvatarSelector}
        onSelect={setAvatar}
        selectedAvatar={useAppStore((state) => state.currentUser?.avatarId)}
      />
    </div>
  );
}
