import React, { useState } from 'react';
import {
  Menu,
  Search,
  Plus,
  Settings,
  User,
  Bookmark,
  Users,
  Megaphone,
  Moon,
  LogOut,
  X,
} from 'lucide-react';
import { Chat } from '../types';
import { ChatList } from './ChatList';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  chats: Chat[];
  selectedChatId?: string;
  onSelectChat: (chat: Chat) => void;
  myAvatar: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  myAvatar,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const filteredChats = chats.filter((chat) =>
    chat.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const menuItems = [
    { icon: <User className="h-[22px] w-[22px]" />, label: 'Мой профиль' },
    { icon: <Users className="h-[22px] w-[22px]" />, label: 'Новая группа' },
    { icon: <Megaphone className="h-[22px] w-[22px]" />, label: 'Новый канал' },
    { icon: <Bookmark className="h-[22px] w-[22px]" />, label: 'Избранное' },
    { icon: <Settings className="h-[22px] w-[22px]" />, label: 'Настройки' },
    { icon: <Moon className="h-[22px] w-[22px]" />, label: 'Ночной режим' },
    { icon: <LogOut className="h-[22px] w-[22px]" />, label: 'Выйти' },
  ];

  return (
    <div className="relative flex h-full w-full flex-col bg-white dark:bg-[#17212b]">
      {/* Search bar */}
      <div className="flex-shrink-0 px-2 pt-2 pb-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
          >
            <Menu className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
          </button>
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder='Поиск'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full bg-[#f4f4f5] dark:bg-[#242f3d] py-[8px] pl-10 pr-4 text-[15px] focus:outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 border border-transparent focus:border-[#3390ec]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat list */}
      <ChatList
        chats={filteredChats}
        selectedChatId={selectedChatId}
        onSelectChat={onSelectChat}
      />

      {/* FAB */}
      <button className="absolute bottom-5 right-5 flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[#3390ec] text-white shadow-lg hover:shadow-xl active:scale-95 transition-all">
        <Plus className="h-6 w-6" />
      </button>

      {/* Drawer menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 z-40 bg-black/40"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="absolute inset-y-0 left-0 z-50 w-[280px] bg-white dark:bg-[#17212b] shadow-2xl flex flex-col"
            >
              {/* Profile header */}
              <div className="bg-[#3390ec] dark:bg-[#242f3d] p-5 pb-4">
                <div className="flex items-center gap-4">
                  <div className="h-[56px] w-[56px] overflow-hidden rounded-full border-2 border-white/20 flex-shrink-0">
                    <img src={myAvatar} alt="Me" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[15px] text-white truncate">Пользователь</div>
                    <div className="text-[13px] text-white/70">+7 (999) 123-45-67</div>
                  </div>
                </div>
              </div>
              {/* Menu items */}
              <div className="flex-1 py-2 overflow-y-auto">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    className="flex w-full items-center gap-5 px-5 py-3 text-[15px] text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <span className="text-zinc-400 dark:text-zinc-500">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
