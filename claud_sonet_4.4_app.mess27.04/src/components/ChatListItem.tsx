import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Pin } from 'lucide-react';
import { Chat } from '../store/useStore';
import { useStore } from '../store/useStore';
import { formatAddress } from '../utils/wallet';
import Avatar from './Avatar';

interface ChatListItemProps {
  chat: Chat;
  active?: boolean;
  onClick: () => void;
}

function getChatDisplayName(chat: Chat, myAddress: string | null): string {
  if (chat.type === 'group') return chat.name || 'Групповой чат';
  const other = chat.participants.find((p) => p !== myAddress);
  return other ? formatAddress(other) : 'Неизвестный';
}

function getChatAddress(chat: Chat, myAddress: string | null): string {
  if (chat.type === 'group') return chat.id;
  return chat.participants.find((p) => p !== myAddress) || '0x0';
}

export default function ChatListItem({ chat, active, onClick }: ChatListItemProps) {
  const { walletAddress, contacts, pinnedChats } = useStore();
  const isPinned = pinnedChats.includes(chat.id);

  const otherAddress = getChatAddress(chat, walletAddress);
  const contact = contacts.find((c) => c.address === otherAddress);
  const displayName = contact?.name || contact?.ens || getChatDisplayName(chat, walletAddress);

  const lastMsg = chat.messages[chat.messages.length - 1];
  const lastContent = lastMsg
    ? lastMsg.type === 'text'
      ? lastMsg.content
      : lastMsg.type === 'image'
      ? '🖼 Фото'
      : '📎 Файл'
    : 'Начните чат...';

  const isFromMe = lastMsg?.from === walletAddress;
  const timeAgo = lastMsg
    ? formatDistanceToNow(new Date(lastMsg.timestamp), { addSuffix: false, locale: ru })
    : '';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left group
        ${active
          ? 'bg-purple-600/20 border border-purple-500/30'
          : 'hover:bg-white/5 border border-transparent'
        }`}
    >
      <div className="relative">
        <Avatar
          address={chat.type === 'group' ? chat.id : otherAddress}
          name={chat.type === 'group' ? chat.name : (contact?.name || contact?.ens)}
          size="md"
          status={contact?.status}
          groupCount={chat.type === 'group' ? chat.participants.length : undefined}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`font-semibold text-sm truncate ${active ? 'text-white' : 'text-gray-100'}`}>
            {displayName}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            {isPinned && <Pin className="w-3 h-3 text-gray-500" />}
            {timeAgo && (
              <span className={`text-xs ${chat.unread > 0 ? 'text-purple-400' : 'text-gray-500'}`}>
                {timeAgo}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 truncate flex-1">
            {isFromMe && <span className="text-gray-500">Вы: </span>}
            {lastContent}
          </p>
          {chat.unread > 0 && (
            <span className="ml-2 flex-shrink-0 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-purple-600 text-white text-xs font-bold px-1.5">
              {chat.unread > 99 ? '99+' : chat.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
