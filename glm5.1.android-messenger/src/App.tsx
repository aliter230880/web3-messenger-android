import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { LoginScreen } from './components/LoginScreen';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';
import { ContactsPanel } from './components/ContactsPanel';
import { SettingsPanel } from './components/SettingsPanel';

function MainApp() {
  const { activePanel, showMobileChat } = useStore();

  const renderSidebar = () => {
    switch (activePanel) {
      case 'contacts':
        return <ContactsPanel />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <ChatList />;
    }
  };

  return (
    <div className="h-full w-full flex bg-[#17212b] overflow-hidden">
      {/* Sidebar */}
      <div className={`
        ${showMobileChat ? 'hidden md:flex' : 'flex'}
        w-full md:w-[420px] md:min-w-[340px] md:max-w-[460px]
        flex-col md:border-r
        relative z-10
      `} style={{ borderRight: '1px solid #0e162133' }}>
        {renderSidebar()}
      </div>

      {/* Chat window */}
      <div className={`
        ${showMobileChat ? 'flex' : 'hidden md:flex'}
        flex-1 flex-col min-w-0
      `}>
        <ChatWindow />
      </div>
    </div>
  );
}

export default function App() {
  const { wallet } = useStore();

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('touchstart', handleTouchStart, { passive: false });

    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }

    return () => document.removeEventListener('touchstart', handleTouchStart);
  }, []);

  if (!wallet) {
    return <LoginScreen />;
  }

  return <MainApp />;
}
