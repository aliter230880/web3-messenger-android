import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Check, CheckCheck, Lock } from 'lucide-react';
import { Message } from '../store/useStore';
import { useStore } from '../store/useStore';
import { formatAddress } from '../utils/wallet';
import Avatar from './Avatar';

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
  isGroup?: boolean;
}

export default function MessageBubble({ message, showAvatar = false, isGroup = false }: MessageBubbleProps) {
  const { walletAddress, contacts } = useStore();
  const isMe = message.from === walletAddress;

  const contact = contacts.find((c) => c.address === message.from);
  const senderName = contact?.name || contact?.ens || formatAddress(message.from, 4);

  const time = format(new Date(message.timestamp), 'HH:mm', { locale: ru });

  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs text-gray-500 bg-white/5 rounded-full px-3 py-1">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {showAvatar && !isMe && (
        <div className="flex-shrink-0 mb-1">
          <Avatar
            address={message.from}
            name={contact?.name || contact?.ens}
            size="xs"
            status={contact?.status}
          />
        </div>
      )}
      {!showAvatar && !isMe && <div className="w-7 flex-shrink-0" />}

      {/* Bubble */}
      <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Sender name (groups only) */}
        {isGroup && !isMe && showAvatar && (
          <span className="text-xs font-medium text-purple-400 mb-1 ml-1">{senderName}</span>
        )}

        <div
          className={`relative group rounded-2xl px-3.5 py-2.5 shadow-sm
            ${isMe
              ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-br-sm'
              : 'bg-[#1e1e30] text-gray-100 border border-white/5 rounded-bl-sm'
            }`}
        >
          {/* Encrypted indicator */}
          {message.encrypted && (
            <div className={`flex items-center gap-1 text-xs mb-1 ${isMe ? 'text-purple-200' : 'text-gray-500'}`}>
              <Lock className="w-3 h-3" />
              <span>зашифровано</span>
            </div>
          )}

          <p className="text-sm leading-relaxed break-words">{message.content}</p>

          {/* Time and status */}
          <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            <span className={`text-[10px] ${isMe ? 'text-purple-200/70' : 'text-gray-500'}`}>{time}</span>
            {isMe && (
              message.read
                ? <CheckCheck className="w-3 h-3 text-blue-300" />
                : <Check className="w-3 h-3 text-purple-200/70" />
            )}
          </div>
        </div>
      </div>

      {/* Me avatar placeholder */}
      {showAvatar && isMe && <div className="w-7 flex-shrink-0" />}
    </div>
  );
}
