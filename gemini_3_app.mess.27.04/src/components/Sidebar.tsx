import React, { useState } from 'react';
import { Menu, Search, Plus } from 'lucide-react';
import { Chat } from '../types';
import { ChatList } from './ChatList';
import { API_BASE_URL } from '../services/api';

interface SidebarProps {
  chats: Chat[];
  selectedChatId?: string;
  onSelectChat: (chat: Chat) => void;
}

import { Settings, User, Bookmark, Users, Megaphone, Moon, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Sidebar: React.FC<SidebarProps> = ({ chats, selectedChatId, onSelectChat }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const filteredChats = chats.filter((chat) =>
    chat.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const menuItems = [
    { icon: <User className="h-5 w-5" />, label: 'My Profile' },
    { icon: <Users className="h-5 w-5" />, label: 'New Group' },
    { icon: <Megaphone className="h-5 w-5" />, label: 'New Channel' },
    { icon: <Bookmark className="h-5 w-5" />, label: 'Saved Messages' },
    { icon: <Settings className="h-5 w-5" />, label: 'Settings' },
    { icon: <Moon className="h-5 w-5" />, label: 'Night Mode' },
    { icon: <Info className="h-5 w-5" />, label: 'About' },
  ];

  return (
    <div className="relative flex h-full w-full flex-col bg-white dark:bg-[#17212b] border-r dark:border-zinc-900">
      <div className="p-3 pb-1">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
          >
            <Menu className="h-6 w-6 text-zinc-400" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full bg-zinc-100 dark:bg-[#242f3d] py-1.5 pl-10 pr-4 text-[15px] focus:outline-none dark:text-zinc-100 border border-transparent focus:border-blue-500"
            />
          </div>
        </div>
      </div>
      
      <ChatList 
        chats={filteredChats} 
        selectedChatId={selectedChatId} 
        onSelectChat={onSelectChat} 
      />

      <button className="absolute bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#50a2e9] text-white shadow-md hover:bg-blue-600 active:scale-95 transition-transform">
        <Plus className="h-6 w-6" />
      </button>

      {/* Drawer Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 z-50 w-[280px] bg-white dark:bg-[#17212b] shadow-2xl"
            >
              <div className="bg-[#50a2e9] p-6 text-white dark:bg-[#242f3d]">
                <div className="mb-4 h-16 w-16 overflow-hidden rounded-full border-2 border-white/20">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" />
                </div>
                <div className="font-semibold text-[15px]">Admin User</div>
                <div className="text-xs opacity-80">{API_BASE_URL}</div>
              </div>
              <div className="py-2">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    className="flex w-full items-center gap-6 px-6 py-3 text-[15px] text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <span className="text-zinc-400">{item.icon}</span>
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
