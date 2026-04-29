import { generateAvatarColor, getInitials } from '../lib/web3';

interface AvatarProps {
  name: string;
  address?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'chat';
  isOnline?: boolean;
  type?: 'private' | 'group' | 'channel' | 'saved';
  className?: string;
}

const sizeMap = {
  xs: { container: 'w-8 h-8', text: 'text-[10px]', dot: 'w-2.5 h-2.5 border-[1.5px]', emoji: 'text-sm' },
  sm: { container: 'w-10 h-10', text: 'text-xs', dot: 'w-2.5 h-2.5 border-[1.5px]', emoji: 'text-base' },
  md: { container: 'w-12 h-12', text: 'text-sm', dot: 'w-3 h-3 border-2', emoji: 'text-lg' },
  chat: { container: 'w-[54px] h-[54px]', text: 'text-lg', dot: 'w-3.5 h-3.5 border-2', emoji: 'text-xl' },
  lg: { container: 'w-16 h-16', text: 'text-xl', dot: 'w-4 h-4 border-2', emoji: 'text-2xl' },
  xl: { container: 'w-[70px] h-[70px]', text: 'text-2xl', dot: 'w-4 h-4 border-2', emoji: 'text-3xl' },
};

export function Avatar({ name, address, size = 'md', isOnline, type, className = '' }: AvatarProps) {
  const s = sizeMap[size];
  const bg = generateAvatarColor(address || name);

  const getEmoji = () => {
    if (type === 'saved') return '🔖';
    if (type === 'channel') return '📢';
    if (type === 'group') return '👥';
    return null;
  };

  const emoji = getEmoji();

  return (
    <div className={`relative flex-shrink-0 ${s.container} ${className}`}>
      <div
        className={`${s.container} rounded-full flex items-center justify-center`}
        style={{ background: bg }}
      >
        {emoji ? (
          <span className={s.emoji}>{emoji}</span>
        ) : (
          <span className={`${s.text} font-semibold text-white/90 leading-none`}>
            {getInitials(name)}
          </span>
        )}
      </div>
      {isOnline !== undefined && isOnline && (
        <div
          className={`absolute bottom-0 right-0 ${s.dot} rounded-full bg-[#4dcd5e] border-[#17212b]`}
        />
      )}
    </div>
  );
}
