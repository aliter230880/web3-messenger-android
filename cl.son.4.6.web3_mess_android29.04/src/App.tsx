import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { LoginScreen } from './components/LoginScreen';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';
import { ContactsPanel } from './components/ContactsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { generateMockChats, generateMockContacts } from './lib/mockData';

function MainApp() {
  const { activePanel, activeChat, setChats, setContacts } = useStore();
  const wallet = useStore((s) => s.wallet);

  useEffect(() => {
    if (wallet) {
      setChats(generateMockChats(wallet.address));
      setContacts(generateMockContacts());
    }
  }, [wallet?.address]);

  const showChatWindow = activeChat !== null;

  const renderSidebar = () => {
    if (activePanel === 'contacts') return <ContactsPanel />;
    if (activePanel === 'settings') return <SettingsPanel />;
    return <ChatList />;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0e1621]">
      {/* Sidebar - always visible on desktop, conditionally on mobile */}
      <div
        className={`
          flex-shrink-0 flex flex-col
          w-full md:w-[360px] lg:w-[380px]
          ${showChatWindow ? 'hidden md:flex' : 'flex'}
          border-r border-[#0e1621]
        `}
        style={{ height: '100dvh' }}
      >
        {renderSidebar()}
      </div>

      {/* Chat Window - takes remaining space */}
      <div
        className={`
          flex-1 flex flex-col min-w-0
          ${showChatWindow ? 'flex' : 'hidden md:flex'}
        `}
        style={{ height: '100dvh' }}
      >
        <ChatWindow />
      </div>
    </div>
  );
}

export default function App() {
  const wallet = useStore((s) => s.wallet);

  if (!wallet) {
    return <LoginScreen />;
  }

  return <MainApp />;
}
