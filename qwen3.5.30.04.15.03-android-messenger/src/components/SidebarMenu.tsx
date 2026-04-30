import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Palette, Languages, Shield, HelpCircle, LogOut, Wallet, Smartphone, Folder, Sticker, Users, Bookmark, Moon, Sun } from 'lucide-react';
import { useAppStore } from '../store';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SidebarMenu({ isOpen, onClose }: SidebarMenuProps) {
  const { currentUser, wallet, toggleWalletModal, isDarkMode, toggleDarkMode } = useAppStore();

  const menuItems = [
    { icon: Users, label: 'Группы', subtitle: '', action: () => {} },
    { icon: Bookmark, label: 'Закладки', subtitle: '', action: () => {} },
    { icon: Bookmark, label: 'Избранное', subtitle: '', action: () => {} },
    { icon: Folder, label: 'Папки', subtitle: '', action: () => {} },
  ];

  const settingsItems = [
    { icon: Bell, label: 'Уведомления', subtitle: 'Вкл', action: () => {} },
    { icon: Palette, label: 'Оформление', subtitle: 'Классическое', action: () => {} },
    { icon: Languages, label: 'Язык', subtitle: 'Русский', action: () => {} },
    { icon: Shield, label: 'Конфиденциальность', subtitle: '', action: () => {} },
    { icon: Smartphone, label: 'Устройства', subtitle: '2 активных', action: () => {} },
    { icon: Sticker, label: 'Набор стикеров', subtitle: '', action: () => {} },
    { icon: HelpCircle, label: 'Помощь', subtitle: '', action: () => {} },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-80 bg-white shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="relative h-48 bg-gradient-to-br from-[#3390ec] to-[#1a73e8]">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              {/* Profile */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-2xl border-2 border-white/30">
                  {currentUser?.avatar || 'П'}
                </div>
                <div className="flex-1 pb-1">
                  <h3 className="text-lg font-semibold text-white">
                    {currentUser?.name}
                  </h3>
                  <p className="text-sm text-white/70">
                    {wallet.isConnected 
                      ? `${wallet.address?.slice(0, 6)}...${wallet.address?.slice(-4)}`
                      : 'в сети'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Wallet Card */}
            <div className="px-4 py-3">
              <button
                onClick={toggleWalletModal}
                className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3390ec] to-[#1a73e8] flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900">
                    {wallet.isConnected ? 'Web3 кошелёк' : 'Подключить кошелёк'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {wallet.balance || 'Не подключён'}
                  </p>
                </div>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2">
              <div className="space-y-0.5">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      item.action();
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <item.icon className="w-5 h-5 text-[#3390ec]" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 text-sm">
                        {item.label}
                      </p>
                      {item.subtitle && (
                        <p className="text-xs text-gray-500">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="mx-4 my-2 h-px bg-gray-200" />

            {/* Settings */}
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">
                Настройки
              </p>
              <div className="space-y-0.5">
                {settingsItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      item.action();
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <item.icon className="w-5 h-5 text-[#3390ec]" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 text-sm">
                        {item.label}
                      </p>
                      {item.subtitle && (
                        <p className="text-xs text-gray-500">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="px-4 py-3 mt-2">
              <button
                onClick={toggleDarkMode}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isDarkMode ? (
                    <Sun className="w-5 h-5 text-[#3390ec]" />
                  ) : (
                    <Moon className="w-5 h-5 text-[#3390ec]" />
                  )}
                  <span className="font-medium text-gray-900">
                    {isDarkMode ? 'Светлая тема' : 'Тёмная тема'}
                  </span>
                </div>
                <div className={`relative w-12 h-6 rounded-full transition-colors ${
                  isDarkMode ? 'bg-[#3390ec]' : 'bg-gray-300'
                }`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    isDarkMode ? 'left-7' : 'left-1'
                  }`} />
                </div>
              </button>
            </div>

            {/* Logout */}
            <div className="px-4 py-4 mt-2">
              <button className="w-full flex items-center justify-center gap-2 py-3 px-4 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium">
                <LogOut className="w-5 h-5" />
                Выйти
              </button>
            </div>

            {/* App Version */}
            <div className="px-4 pb-6 text-center">
              <p className="text-xs text-gray-400">
                Web3 Messenger v1.0
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
