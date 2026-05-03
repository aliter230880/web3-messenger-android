import { useState } from 'react';
import { Search, UserPlus, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

interface NewChatModalProps {
  onClose: () => void;
}

export function NewChatModal({ onClose }: NewChatModalProps) {
  const { chats, setChats, setActiveChat } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');

  const contacts = [
    { id: 'c1', name: 'Александр Волков', avatar: 'АВ', walletAddress: '0x1a2b...3c4d', isOnPlatform: true },
    { id: 'c2', name: 'Дмитрий Соколов', avatar: 'ДС', walletAddress: '0x5e6f...7g8h', isOnPlatform: true },
    { id: 'c3', name: 'Елена Кузнецова', avatar: 'ЕК', walletAddress: null, isOnPlatform: false },
    { id: 'c4', name: 'Игорь Морозов', avatar: 'ИМ', walletAddress: '0x9i0j...1k2l', isOnPlatform: true },
    { id: 'c5', name: 'Наталья Павлова', avatar: 'НП', walletAddress: '0x3m4n...5o6p', isOnPlatform: true },
  ];

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartChat = (contact: typeof contacts[0]) => {
    const existingChat = chats.find(
      (chat) => chat.participants.some((p) => p.name === contact.name)
    );

    if (existingChat) {
      setActiveChat(existingChat.id);
    } else {
      const newChat = {
        id: `chat-${Date.now()}`,
        type: 'private' as const,
        name: contact.name,
        avatar: contact.avatar,
        participants: [
          {
            id: contact.id,
            name: contact.name,
            avatar: contact.avatar,
            walletAddress: contact.walletAddress,
            isOnline: false,
          },
        ],
        unreadCount: 0,
        isPinned: false,
        isMuted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setChats([newChat, ...chats]);
      setActiveChat(newChat.id);
    }
    onClose();
  };

  const getAvatarGradient = (name: string) => {
    const colors = [
      'avatar-gradient-1',
      'avatar-gradient-2',
      'avatar-gradient-3',
      'avatar-gradient-4',
      'avatar-gradient-5',
      'avatar-gradient-6',
      'avatar-gradient-7',
      'avatar-gradient-8',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <AnimatePresence>
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50"
          onClick={onClose}
        />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-full max-w-md bg-[#f1f1f1] shadow-2xl z-50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-3 bg-[#3390ec]">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h2 className="text-lg font-semibold text-white flex-1">
              Новый чат
            </h2>
          </div>

          {/* Search */}
          <div className="p-3 bg-white border-b border-gray-300">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск контактов"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-100 hover:bg-gray-200 focus:bg-white focus:ring-2 focus:ring-[#3390ec] rounded-full text-gray-900 placeholder-gray-500 transition-all outline-none"
              />
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto">
            <div className="py-2">
              <div className="px-4 py-2 text-sm font-medium text-gray-500">
                Контактов: {filteredContacts.length}
              </div>
              
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleStartChat(contact)}
                  className="w-full flex items-center gap-3 p-3 mx-2 my-0.5 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <div className={`w-12 h-12 rounded-full ${getAvatarGradient(contact.name)} flex items-center justify-center text-white font-semibold text-base flex-shrink-0`}>
                    {contact.avatar}
                  </div>
                  <div className="flex-1 text-left border-b border-gray-100 pb-2.5">
                    <h3 className="font-medium text-gray-900">
                      {contact.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {contact.isOnPlatform
                        ? contact.walletAddress || 'В Web3 Messenger'
                        : 'Пригласить в Messenger'}
                    </p>
                  </div>
                  {contact.isOnPlatform ? (
                    <UserPlus className="w-5 h-5 text-[#3390ec] flex-shrink-0" />
                  ) : (
                    <span className="text-xs px-2.5 py-1 bg-gray-200 rounded-full text-gray-500 flex-shrink-0">
                      Пригласить
                    </span>
                  )}
                </button>
              ))}

              {filteredContacts.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <p className="text-sm">Контакты не найдены</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
