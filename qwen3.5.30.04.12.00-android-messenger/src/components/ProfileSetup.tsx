import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useWeb3Messenger } from '../hooks/useWeb3Messenger';
import { AvatarSelector } from './AvatarSelector';

interface ProfileSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProfileSetup({ isOpen, onClose, onSuccess }: ProfileSetupProps) {
  const { registerProfile } = useWeb3Messenger();
  const [nickname, setNickname] = useState('');
  const [avatarId, setAvatarId] = useState<number | undefined>(undefined);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname.trim() || avatarId === undefined) {
      setError('Введите имя и выберите аватар');
      return;
    }

    try {
      setIsRegistering(true);
      setError(null);
      
      // AvatarId 0-23 для совместимости
      await registerProfile(nickname.trim(), avatarId);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Ошибка регистрации профиля:', err);
      setError(
        err.code === 'ACTION_REJECTED' 
          ? 'Подпишите транзакцию в MetaMask' 
          : err.message || 'Не удалось зарегистрировать профиль'
      );
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Создание профиля
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Avatar Selection */}
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Выберите аватар
                </label>
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(true)}
                  className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-3xl hover:scale-105 transition-transform"
                >
                  {avatarId ? (
                    <img
                      src={avatarId <= 22 
                        ? `https://raw.githubusercontent.com/aliter230880/web3-messenger-android/main/ava/ava%20(${avatarId}).png`
                        : `https://raw.githubusercontent.com/aliter230880/web3-messenger-android/main/ava/ava1%20(${avatarId - 22}).png`
                      }
                      alt="Avatar"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    '?'
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  {avatarId ? 'Нажмите чтобы изменить' : 'Нажмите для выбора'}
                </p>
              </div>

              {/* Nickname Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Имя пользователя
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Введите ваше имя"
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3390ec] transition-all"
                  maxLength={30}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isRegistering}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#3390ec] to-[#1a73e8] hover:from-[#2b7ecc] hover:to-[#1565c0] text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isRegistering ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Регистрация...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Создать профиль
                  </>
                )}
              </button>

              <p className="text-xs text-center text-gray-400">
                Профиль будет сохранён в блокчейне Polygon
              </p>
            </form>
          </motion.div>

          {/* Avatar Picker */}
          <AvatarSelector
            isOpen={showAvatarPicker}
            onClose={() => setShowAvatarPicker(false)}
            onSelect={setAvatarId}
            selectedAvatar={avatarId}
          />
        </>
      )}
    </AnimatePresence>
  );
}
