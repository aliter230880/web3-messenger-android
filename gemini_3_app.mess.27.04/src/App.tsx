import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { mockChats } from './mockData';
import { Chat } from './types';
import { AnimatePresence, motion } from 'framer-motion';

export default function App() {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
  };

  const handleBack = () => {
    setSelectedChat(null);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-zinc-950">
      {/* Desktop Layout */}
      {!isMobile && (
        <>
          <div className="w-80 flex-shrink-0 lg:w-96">
            <Sidebar 
              chats={mockChats} 
              selectedChatId={selectedChat?.id} 
              onSelectChat={handleSelectChat} 
            />
          </div>
          <div className="flex-1">
            {selectedChat ? (
              <ChatWindow chat={selectedChat} onBack={handleBack} />
            ) : (
              <div className="flex h-full items-center justify-center bg-zinc-50 dark:bg-zinc-900">
                <div className="text-center">
                  <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <svg className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">Select a chat to start messaging</h2>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Mobile Layout */}
      {isMobile && (
        <div className="relative h-full w-full">
          <AnimatePresence initial={false}>
            {!selectedChat ? (
              <motion.div
                key="sidebar"
                initial={{ x: 0 }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-0 z-10"
              >
                <Sidebar 
                  chats={mockChats} 
                  selectedChatId={undefined} 
                  onSelectChat={handleSelectChat} 
                />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-0 z-20"
              >
                <ChatWindow chat={selectedChat} onBack={handleBack} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

