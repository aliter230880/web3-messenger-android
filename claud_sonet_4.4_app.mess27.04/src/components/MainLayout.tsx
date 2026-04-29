import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { wsClient } from '../utils/ws';
import Sidebar from './Sidebar';
import ChatView from './ChatView';
import ContactsView from './ContactsView';
import SettingsView from './SettingsView';
import NewChatModal from './NewChatModal';

export default function MainLayout() {
  const { walletAddress, activeChatId, currentView, updateContact, addMessage } = useStore();

  useEffect(() => {
    if (!walletAddress) return;

    const unsubscribe = wsClient.on((data) => {
      if (data.type === 'online' && data.userId) {
        updateContact(data.userId, { status: data.status });
      }
      if (data.type === 'message' && data.message && data.chatId) {
        addMessage(data.chatId, { ...data.message, type: data.message.type });
      }
    });

    return () => { unsubscribe(); };
  }, [walletAddress, updateContact, addMessage]);

  const renderRightPanel = () => {
    if (currentView === 'new-chat') return <NewChatModal />;
    if (currentView === 'contacts') return <ContactsView />;
    if (currentView === 'settings') return <SettingsView />;
    if (currentView === 'chats') return <ChatView />;
    return <ChatView />;
  };

  return (
    <div className="flex h-full w-full bg-[#0f0f1a] overflow-hidden">
      {/* Mobile: show sidebar or chat */}
      {/* Desktop: always show both */}

      {/* Sidebar - always visible on desktop, hidden when chat is active on mobile */}
      <div
        className={`
          flex-shrink-0 w-full lg:w-80 xl:w-96
          ${activeChatId && currentView === 'chats' ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}
          h-full
        `}
      >
        <Sidebar />
      </div>

      {/* Right panel */}
      <div
        className={`
          flex-1 min-w-0 h-full
          ${!activeChatId && currentView === 'chats' ? 'hidden lg:block' : 'block'}
        `}
      >
        {renderRightPanel()}
      </div>

      {/* Desktop empty state when no chat selected */}
      {!activeChatId && currentView === 'chats' && (
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-[#0f0f1a]">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
          >
            <svg viewBox="0 0 24 24" className="w-12 h-12 text-white fill-current">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Web3 Messenger</h2>
          <p className="text-gray-400 text-sm text-center max-w-xs">
            Выберите чат или начните новый разговор
          </p>
          <div className="mt-4 flex items-center gap-2 text-gray-600 text-xs">
            <div className="w-3 h-3 rounded-full border border-gray-600 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-gray-600 rounded-full" />
            </div>
            <span>Все сообщения зашифрованы end-to-end</span>
          </div>
        </div>
      )}
    </div>
  );
}
