import { useState } from 'react';
import { Menu, Search, MessageSquare, Edit3 } from 'lucide-react';
import { useAppStore } from './store';
import { ChatList } from './components/ChatList';
import { ChatView } from './components/ChatView';
import { SettingsPanel } from './components/SettingsPanel';
import { WalletModal } from './components/WalletModal';
import { NewChatModal } from './components/NewChatModal';
import { AvatarSelector } from './components/AvatarSelector';

export default function App() {
  const { activeChatId, setActiveChat, toggleSettings, isDarkMode } = useAppStore();
  const isAvatarSelectorOpen = useAppStore((state) => state.isAvatarSelectorOpen);
  const toggleAvatarSelector = useAppStore((state) => state.toggleAvatarSelector);
  const setAvatar = useAppStore((state) => state.setAvatar);
  const currentUser = useAppStore((state) => state.currentUser);
  const [showMobileList, setShowMobileList] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);

  const handleChatSelect = (chatId: string) => {
    setActiveChat(chatId);
    setShowMobileList(false);
  };

  const handleBack = () => {
    setActiveChat(null);
    setShowMobileList(true);
  };

  return (
    <div className={`h-screen w-screen overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      <div className="h-full max-w-[1600px] mx-auto flex shadow-xl">
        {/* Sidebar - Chat List */}
        <div
          className={`${
            showMobileList ? 'flex' : 'hidden'
          } lg:flex flex-col w-full lg:w-[420px] bg-white dark:bg-[#212121] border-r border-gray-300 dark:border-gray-700`}
        >
          {/* Sidebar Header - Telegram Style */}
          <div className="flex items-center gap-3 p-2.5">
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
          </div>

          {/* Chat List */}
          <ChatList onChatSelect={handleChatSelect} />
        </div>

        {/* Main Content - Chat View */}
        <div
          className={`${
            showMobileList ? 'hidden' : 'flex'
          } lg:flex flex-1 flex-col`}
        >
          {activeChatId ? (
            <ChatView chatId={activeChatId} onBack={handleBack} />
          ) : (
            <div className="flex-1 flex items-center justify-center chat-bg dark:bg-[#0f0f0f]">
              <div className="text-center p-8">
                <div className="inline-flex items-center justify-center w-28 h-28 mx-auto mb-6 rounded-full bg-black/10 dark:bg-white/10">
                  <MessageSquare className="w-14 h-14 text-white/60" />
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

      {/* Settings Panel */}
      <SettingsPanel />

      {/* Wallet Modal */}
      <WalletModal />

      {/* New Chat Modal */}
      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}

      {/* Avatar Selector */}
      <AvatarSelector
        isOpen={isAvatarSelectorOpen}
        onClose={toggleAvatarSelector}
        onSelect={setAvatar}
        selectedAvatar={currentUser?.avatarId}
      />

      {/* FAB for mobile */}
      {showMobileList && (
        <button
          onClick={() => setShowNewChat(true)}
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#3390ec] hover:bg-[#2b7ecc] text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 z-30"
        >
          <Edit3 className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
