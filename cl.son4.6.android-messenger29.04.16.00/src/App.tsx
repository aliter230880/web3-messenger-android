import { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Toast from './components/Toast';
import SplashScreen from './screens/SplashScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ChatsScreen from './screens/ChatsScreen';
import ChatScreen from './screens/ChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import ContactsScreen from './screens/ContactsScreen';
import SettingsScreen from './screens/SettingsScreen';
import NewChatScreen from './screens/NewChatScreen';

function AppRouter() {
  const { screen, setScreen } = useApp();

  // Handle Android back button
  useEffect(() => {
    const handlePopState = () => {
      if (screen === 'chat') setScreen('chats');
      else if (screen === 'profile' || screen === 'contacts' || screen === 'settings' || screen === 'newChat') setScreen('chats');
      else if (screen === 'login' || screen === 'register') setScreen('welcome');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [screen, setScreen]);

  const screens = {
    splash: <SplashScreen />,
    welcome: <WelcomeScreen />,
    login: <LoginScreen />,
    register: <RegisterScreen />,
    chats: <ChatsScreen />,
    chat: <ChatScreen />,
    profile: <ProfileScreen />,
    contacts: <ContactsScreen />,
    settings: <SettingsScreen />,
    newChat: <NewChatScreen />,
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {screens[screen]}
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
