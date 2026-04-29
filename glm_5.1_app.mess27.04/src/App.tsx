import { useState, useCallback, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { initialChats, botResponses } from './mockData';
import { Chat, Message } from './types';
import { AnimatePresence, motion } from 'framer-motion';

const MY_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=b6e3f4';

function loadChats(): Chat[] {
  try {
    const saved = localStorage.getItem('aliterra_chats');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate it's an array
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return initialChats;
}

function saveChats(chats: Chat[]) {
  try {
    localStorage.setItem('aliterra_chats', JSON.stringify(chats));
  } catch {}
}

export default function App() {
  const [chats, setChats] = useState<Chat[]>(loadChats);
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(undefined);
  const [isMobile, setIsMobile] = useState(false);
  const pendingBotTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Persist chats
  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  const handleSelectChat = useCallback((chat: Chat) => {
    setSelectedChatId(chat.id);
    // Clear unread
    setChats((prev) =>
      prev.map((c) =>
        c.id === chat.id ? { ...c, unreadCount: 0 } : c
      )
    );
  }, []);

  const handleBack = useCallback(() => {
    setSelectedChatId(undefined);
  }, []);

  const handleSendMessage = useCallback((chatId: string, text: string) => {
    const newMsg: Message = {
      id: Date.now().toString(),
      text,
      senderId: 'me',
      timestamp: Date.now(),
      isMe: true,
      status: 'sent',
    };

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              messages: [...c.messages, newMsg],
              lastActivity: Date.now(),
            }
          : c
      )
    );

    // Mark as delivered after 500ms
    setTimeout(() => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === newMsg.id ? { ...m, status: 'delivered' as const } : m
                ),
              }
            : c
        )
      );
    }, 500);

    // Mark as read after 1s
    setTimeout(() => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === newMsg.id ? { ...m, status: 'read' as const } : m
                ),
              }
            : c
        )
      );
    }, 1200);

    // Simulate bot response
    const chat = chats.find((c) => c.id === chatId);
    if (chat && chat.user.id !== 'saved' && chat.user.id !== 'telegram') {
      const responses = botResponses[chat.user.id];
      if (responses && responses.length > 0) {
        // Show typing indicator
        const typingDelay = 800 + Math.random() * 1200;
        
        // Clear any existing timer for this chat
        const existing = pendingBotTimers.current.get(chatId);
        if (existing) clearTimeout(existing);

        const typingTimer = setTimeout(() => {
          setChats((prev) =>
            prev.map((c) =>
              c.id === chatId
                ? { ...c, user: { ...c.user, status: 'typing' as const } }
                : c
            )
          );

          const replyDelay = 1500 + Math.random() * 2000;
          const replyTimer = setTimeout(() => {
            const replyText = responses[Math.floor(Math.random() * responses.length)];
            const replyMsg: Message = {
              id: (Date.now() + 1).toString(),
              text: replyText,
              senderId: chat.user.id,
              timestamp: Date.now(),
              isMe: false,
              status: 'delivered',
            };

            setChats((prev) =>
              prev.map((c) =>
                c.id === chatId
                  ? {
                      ...c,
                      messages: [...c.messages, replyMsg],
                      lastActivity: Date.now(),
                      user: { ...c.user, status: 'online' as const },
                      unreadCount: selectedChatId === chatId ? 0 : c.unreadCount + 1,
                    }
                  : c
              )
            );
            pendingBotTimers.current.delete(chatId);
          }, replyDelay);
          pendingBotTimers.current.set(chatId + '_reply', replyTimer);
        }, typingDelay);
        pendingBotTimers.current.set(chatId, typingTimer);
      }
    }
  }, [chats, selectedChatId]);

  const sidebarContent = (
    <Sidebar
      chats={chats}
      selectedChatId={selectedChatId}
      onSelectChat={handleSelectChat}
      myAvatar={MY_AVATAR}
    />
  );

  const chatContent = selectedChat ? (
    <ChatWindow
      chat={selectedChat}
      onBack={handleBack}
      onSendMessage={handleSendMessage}
    />
  ) : (
    <div className="flex h-full items-center justify-center bg-[#e6ebee] dark:bg-[#0e1621]">
      <div className="text-center px-6">
        <div className="mb-6 inline-flex h-[120px] w-[120px] items-center justify-center rounded-full bg-white/60 dark:bg-white/10 shadow-sm">
          <svg className="h-16 w-16 text-[#3390ec]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-zinc-600 dark:text-zinc-300 mb-2">
          Выберите чат для начала общения
        </h2>
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          Отправляйте сообщения и получайте мгновенные ответы
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-zinc-950">
      {/* Desktop layout */}
      {!isMobile && (
        <>
          <div className="w-[350px] lg:w-[400px] flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800">
            {sidebarContent}
          </div>
          <div className="flex-1 min-w-0">
            {chatContent}
          </div>
        </>
      )}

      {/* Mobile layout */}
      {isMobile && (
        <div className="relative h-full w-full">
          <AnimatePresence initial={false}>
            {!selectedChat ? (
              <motion.div
                key="sidebar"
                initial={{ x: 0 }}
                animate={{ x: 0 }}
                exit={{ x: '-30%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="absolute inset-0 z-10"
              >
                {sidebarContent}
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="absolute inset-0 z-20"
              >
                {chatContent}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
