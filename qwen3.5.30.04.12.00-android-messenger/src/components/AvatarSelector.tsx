import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

interface AvatarSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (avatarId: number) => void;
  selectedAvatar?: number;
}

const AVATAR_COUNT = 22;
const AVATAR1_COUNT = 6;

export function AvatarSelector({ isOpen, onClose, onSelect, selectedAvatar }: AvatarSelectorProps) {
  const [selectedId, setSelectedId] = useState<number | undefined>(selectedAvatar);

  useEffect(() => {
    setSelectedId(selectedAvatar);
  }, [selectedAvatar, isOpen]);

  const handleSelect = (avatarId: number) => {
    setSelectedId(avatarId);
    onSelect(avatarId);
    onClose();
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

          {/* Selector Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 bg-white dark:bg-[#212121] rounded-t-3xl shadow-2xl z-50 max-h-[85vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-4 bg-white dark:bg-[#212121] border-b border-gray-200 dark:border-gray-700 z-10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Выберите аватар
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* Avatar Grid */}
            <div className="p-4 pb-8">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-1">
                Коллекция 1
              </p>
              <div className="grid grid-cols-4 gap-3 mb-6">
                {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map((avatarId) => (
                  <button
                    key={`ava-${avatarId}`}
                    onClick={() => handleSelect(avatarId)}
                    className={`relative w-[70px] h-[70px] rounded-2xl overflow-hidden transition-all flex-shrink-0 ${
                      selectedId === avatarId
                        ? 'ring-4 ring-[#3390ec] ring-offset-2 dark:ring-offset-[#212121]'
                        : 'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600'
                    }`}
                  >
                    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center p-2">
                      <img
                        src={`https://raw.githubusercontent.com/aliter230880/web3-messenger-android/main/ava/ava%20(${avatarId}).png`}
                        alt={`Avatar ${avatarId}`}
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    </div>
                    {selectedId === avatarId && (
                      <div className="absolute inset-0 bg-[#3390ec]/30 flex items-center justify-center">
                        <div className="w-7 h-7 bg-[#3390ec] rounded-full flex items-center justify-center shadow-lg">
                          <Check className="w-4 h-4 text-white" strokeWidth={3} />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-1">
                Коллекция 2
              </p>
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: AVATAR1_COUNT }, (_, i) => i + 1).map((avatarId) => {
                  const globalId = AVATAR_COUNT + avatarId;
                  return (
                    <button
                      key={`ava1-${avatarId}`}
                      onClick={() => handleSelect(globalId)}
                      className={`relative w-[70px] h-[70px] rounded-2xl overflow-hidden transition-all flex-shrink-0 ${
                        selectedId === globalId
                          ? 'ring-4 ring-[#3390ec] ring-offset-2 dark:ring-offset-[#212121]'
                          : 'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600'
                      }`}
                    >
                      <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center p-2">
                        <img
                          src={`https://raw.githubusercontent.com/aliter230880/web3-messenger-android/main/ava/ava1%20(${avatarId}).png`}
                          alt={`Avatar ${globalId}`}
                          className="w-full h-full object-contain"
                          draggable={false}
                        />
                      </div>
                      {selectedId === globalId && (
                        <div className="absolute inset-0 bg-[#3390ec]/30 flex items-center justify-center">
                          <div className="w-7 h-7 bg-[#3390ec] rounded-full flex items-center justify-center shadow-lg">
                            <Check className="w-4 h-4 text-white" strokeWidth={3} />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer info */}
            <div className="sticky bottom-0 p-4 bg-white dark:bg-[#212121] border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-center text-gray-400">
                Нажмите на аватар для выбора
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
