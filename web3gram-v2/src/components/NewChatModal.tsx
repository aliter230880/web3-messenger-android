import { useState, useCallback } from 'react';
import { Search, ArrowLeft, CheckCircle, XCircle, Loader, MessageSquarePlus } from 'lucide-react';
import { useAppStore } from '../store';
import { useWeb3Messenger } from '../hooks/useWeb3Messenger';
import { motion, AnimatePresence } from 'framer-motion';

interface NewChatModalProps {
  onClose: () => void;
}

const AVATAR_GRADIENTS = [
  'avatar-gradient-1','avatar-gradient-2','avatar-gradient-3','avatar-gradient-4',
  'avatar-gradient-5','avatar-gradient-6','avatar-gradient-7','avatar-gradient-8',
];

function getAvatarGradient(name: string) {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

type CheckState = 'idle' | 'checking' | 'ok' | 'warn';

export function NewChatModal({ onClose }: NewChatModalProps) {
  const { chats, setActiveChat } = useAppStore();
  const { canMessage, startChat, isE2EInitialized } = useWeb3Messenger();

  const [addressInput, setAddressInput] = useState('');
  const [checkState, setCheckState] = useState<CheckState>('idle');
  const [checkWarn, setCheckWarn] = useState('');

  const isValidAddress = /^0x[0-9a-fA-F]{40}$/.test(addressInput.trim());
  const existingChats = chats.filter((c) => !c.id.startsWith('mock-'));

  const handleCheck = useCallback(async () => {
    const addr = addressInput.trim();
    if (!isValidAddress) return;
    setCheckState('checking');
    setCheckWarn('');
    try {
      const ok = await canMessage(addr);
      if (ok) {
        setCheckState('ok');
      } else {
        // Not blocking — just a soft warning, user can still start chat
        setCheckState('warn');
        setCheckWarn('Адрес пока не найден в сети XMTP. Вы всё равно можете начать чат — сообщения дойдут, когда собеседник откроет приложение.');
      }
    } catch (_) {
      // Any error — treat as "unknown", don't block
      setCheckState('ok');
    }
  }, [addressInput, isValidAddress, canMessage]);

  const handleStartChat = useCallback(() => {
    const addr = addressInput.trim();
    const chatId = startChat(addr);
    setActiveChat(chatId);
    onClose();
  }, [addressInput, startChat, setActiveChat, onClose]);

  const handleSelectExisting = (chat: typeof chats[0]) => {
    setActiveChat(chat.id);
    onClose();
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
            <h2 className="text-lg font-semibold text-white flex-1">Новый чат</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Address input section */}
            <div className="bg-white mx-0 mt-0 p-4 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Начать чат по адресу кошелька
              </p>

              <div className="relative">
                <input
                  type="text"
                  placeholder="0x..."
                  value={addressInput}
                  onChange={(e) => {
                    setAddressInput(e.target.value);
                    setCheckState('idle');
                    setCheckError('');
                  }}
                  className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 focus:bg-white focus:ring-2 focus:ring-[#3390ec] rounded-xl text-gray-900 placeholder-gray-400 outline-none transition-all font-mono text-sm"
                />
              </div>

              {/* Status */}
              {checkState === 'ok' && (
                <div className="flex items-center gap-2 mt-3 text-emerald-600">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">Адрес найден в сети XMTP — можно писать!</span>
                </div>
              )}
              {checkState === 'warn' && (
                <div className="flex items-start gap-2 mt-3 text-amber-600">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{checkWarn}</span>
                </div>
              )}
              {!isE2EInitialized && (
                <p className="text-xs text-amber-600 mt-2">
                  Подключи кошелёк, чтобы отправлять реальные сообщения
                </p>
              )}

              {/* Buttons — always show "Начать чат" when address is valid */}
              <div className="flex gap-2 mt-3">
                {checkState === 'idle' || checkState === 'warn' ? (
                  <button
                    onClick={handleCheck}
                    disabled={!isValidAddress || checkState === 'checking'}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-200 hover:bg-gray-300 disabled:opacity-40 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                  >
                    {checkState === 'checking' ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    {checkState === 'checking' ? 'Проверяем...' : 'Проверить'}
                  </button>
                ) : null}
                {/* Primary action — always visible when address is valid */}
                {isValidAddress && checkState !== 'checking' && (
                  <button
                    onClick={handleStartChat}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#3390ec] hover:bg-[#2b7ecc] text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                    Начать чат
                  </button>
                )}
              </div>
            </div>

            {/* Existing conversations */}
            {existingChats.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">
                  Ваши диалоги ({existingChats.length})
                </p>
                {existingChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectExisting(chat)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-full ${getAvatarGradient(chat.name)} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                      {chat.avatar || chat.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left border-b border-gray-100 pb-3">
                      <h3 className="font-medium text-gray-900">{chat.name}</h3>
                      <p className="text-sm text-gray-500 truncate">
                        {chat.lastMessage?.content || 'Нет сообщений'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {existingChats.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 px-8">
                <MessageSquarePlus className="w-12 h-12 mb-4 opacity-40" />
                <p className="text-sm text-center">
                  Введи Ethereum-адрес собеседника выше, чтобы начать зашифрованный чат
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
