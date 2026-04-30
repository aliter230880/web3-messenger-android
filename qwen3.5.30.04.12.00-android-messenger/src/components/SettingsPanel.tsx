import { X, User, Bell, Palette, Languages, Shield, HelpCircle, LogOut, Moon, Sun, Wallet, Globe, Smartphone, Folder, Sticker, Edit2, Check, Camera, Image } from 'lucide-react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { PushNotificationManager } from './PushNotificationManager';
import { ProfileSetup } from './ProfileSetup';

export function SettingsPanel() {
  const { isSettingsOpen, toggleSettings, wallet, toggleWalletModal, currentUser, isDarkMode, toggleDarkMode, toggleAvatarSelector, setCurrentUser } = useAppStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(currentUser?.name || '');
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const handleSaveName = () => {
    if (editedName.trim() && setCurrentUser) {
      setCurrentUser({ ...currentUser!, name: editedName.trim() });
      setIsEditingName(false);
    }
  };

  const getAvatarImage = (avatarId?: number) => {
    if (!avatarId) return null;
    if (avatarId <= 22) {
      return `https://raw.githubusercontent.com/aliter230880/web3-messenger-android/main/ava/ava%20(${avatarId}).png`;
    }
    const avatar1Id = avatarId - 22;
    if (avatar1Id <= 6) {
      return `https://raw.githubusercontent.com/aliter230880/web3-messenger-android/main/ava/ava1%20(${avatar1Id}).png`;
    }
    return null;
  };

  const menuItems = [
    { icon: User, label: 'Учётная запись', subtitle: '+7 999 123-45-67', action: () => {} },
    { icon: Bell, label: 'Уведомления', subtitle: 'Вкл', action: () => {} },
    { icon: Palette, label: 'Оформление', subtitle: 'Классическое', action: () => {} },
    { icon: Languages, label: 'Язык', subtitle: 'Русский', action: () => {} },
    { icon: Shield, label: 'Конфиденциальность', subtitle: '', action: () => {} },
    { icon: Smartphone, label: 'Устройства', subtitle: '2 активных', action: () => {} },
    { icon: Folder, label: 'Папки с чатами', subtitle: '', action: () => {} },
    { icon: Sticker, label: 'Набор стикеров', subtitle: '', action: () => {} },
    { icon: HelpCircle, label: 'Помощь', subtitle: '', action: () => {} },
  ];

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={toggleSettings}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-[#f1f1f1] dark:bg-[#0f0f0f] shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-[#3390ec]">
              <h2 className="text-lg font-semibold text-white">
                Настройки
              </h2>
              <button
                onClick={toggleSettings}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Profile Card - Единая карточка для имени и аватара */}
            <div className="px-4 py-6 bg-[#3390ec]">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-start gap-4">
                  {/* Avatar with edit button */}
                  <div className="relative group">
                    {getAvatarImage(currentUser?.avatarId) ? (
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-white/20 ring-2 ring-white/30">
                        <img
                          src={getAvatarImage(currentUser?.avatarId)!}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-3xl ring-2 ring-white/30">
                        {currentUser?.avatar || 'П'}
                      </div>
                    )}
                    <button
                      onClick={toggleAvatarSelector}
                      className="absolute bottom-0 right-0 p-2 bg-[#3390ec] hover:bg-[#2b7ecc] rounded-full shadow-lg transition-all hover:scale-110"
                      title="Изменить аватар"
                    >
                      <Camera className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  {/* Name and info */}
                  <div className="flex-1 pt-1">
                    {isEditingName ? (
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveName()}
                          className="flex-1 px-3 py-1.5 bg-white/20 rounded-lg text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-white/50 text-base font-medium"
                          autoFocus
                          placeholder="Ваше имя"
                        />
                        <button
                          onClick={handleSaveName}
                          className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        >
                          <Check className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-xl font-semibold text-white mb-0.5">
                          {currentUser?.name}
                        </h3>
                        <button
                          onClick={() => {
                            setEditedName(currentUser?.name || '');
                            setIsEditingName(true);
                          }}
                          className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Изменить имя
                        </button>
                      </>
                    )}
                    
                    <p className="text-sm text-white/60 mt-2 font-mono">
                      {wallet.isConnected 
                        ? `${wallet.address?.slice(0, 6)}...${wallet.address?.slice(-4)}`
                        : 'Кошелёк не подключён'
                      }
                    </p>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-white/20">
                  <button
                    onClick={toggleAvatarSelector}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white text-sm font-medium"
                  >
                    <Image className="w-4 h-4" />
                    Аватар
                  </button>
                  <button
                    onClick={() => {
                      setEditedName(currentUser?.name || '');
                      setIsEditingName(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white text-sm font-medium"
                  >
                    <Edit2 className="w-4 h-4" />
                    Имя
                  </button>
                </div>

                {/* Future upload hint */}
                <p className="text-xs text-white/50 mt-3 text-center">
                  📸 Загрузка фото и GIF будет доступна в следующей версии
                </p>
              </div>
            </div>

            {/* Wallet Card */}
            <div className="px-4 -mt-2">
              <div className="bg-white dark:bg-[#212121] rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={toggleWalletModal}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3390ec] to-[#1a73e8] flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {wallet.isConnected ? 'Web3 кошелёк' : 'Подключить кошелёк'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {wallet.balance || 'Не подключён'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="mt-4 px-4 space-y-1">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.action}
                  className="w-full flex items-center gap-4 px-4 py-3 bg-white dark:bg-[#212121] hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  <item.icon className="w-6 h-6 text-[#3390ec]" />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.label}
                    </p>
                    {item.subtitle && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Push Notifications */}
            <div className="mt-4 px-4">
              <PushNotificationManager />
            </div>

            {/* Theme Toggle */}
            <div className="mt-4 px-4">
              <button
                onClick={toggleDarkMode}
                className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-[#212121] hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-4">
                  {isDarkMode ? (
                    <Sun className="w-6 h-6 text-[#3390ec]" />
                  ) : (
                    <Moon className="w-6 h-6 text-[#3390ec]" />
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {isDarkMode ? 'Светлая тема' : 'Тёмная тема'}
                  </span>
                </div>
                <div className={`relative w-12 h-6 rounded-full transition-colors ${
                  isDarkMode ? 'bg-[#3390ec]' : 'bg-gray-300'
                }`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isDarkMode ? 'left-6' : 'left-0.5'
                  }`} />
                </div>
              </button>
            </div>

            {/* App Info */}
            <div className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <Globe className="w-4 h-4" />
                <span>Web3 Messenger v1.0</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Децентрализованный мессенджер
              </p>
            </div>

            {/* Logout */}
            <div className="p-4">
              <button className="w-full flex items-center justify-center gap-2 py-3 px-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-medium">
                <LogOut className="w-5 h-5" />
                Выйти
              </button>
            </div>
          </motion.div>
        </>
      )}

      {/* Profile Setup Modal */}
      <ProfileSetup
        isOpen={showProfileSetup}
        onClose={() => setShowProfileSetup(false)}
        onSuccess={() => {
          console.log('✅ Профиль успешно создан');
        }}
      />
    </AnimatePresence>
  );
}
