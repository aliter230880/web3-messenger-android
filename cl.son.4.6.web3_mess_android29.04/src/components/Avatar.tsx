import { generateAvatarColor, getInitials } from '../lib/web3';

interface AvatarProps {
  name: string;
  address?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  type?: 'private' | 'group' | 'channel';
  className?: string;
}

const sizeMap = {
  xs: { container: 'w-8 h-8', text: 'text-xs', dot: 'w-2 h-2 border' },
  sm: { container: 'w-10 h-10', text: 'text-sm', dot: 'w-2.5 h-2.5 border' },
  md: { container: 'w-12 h-12', text: 'text-base', dot: 'w-3 h-3 border-[1.5px]' },
  lg: { container: 'w-14 h-14', text: 'text-lg', dot: 'w-3.5 h-3.5 border-2' },
  xl: { container: 'w-20 h-20', text: 'text-2xl', dot: 'w-4 h-4 border-2' },
};

export function Avatar({ name, address, size = 'md', isOnline, type, className = '' }: AvatarProps) {
  const s = sizeMap[size];
  const bg = generateAvatarColor(address || name);

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`${s.container} rounded-full flex items-center justify-center text-white font-semibold select-none`}
        style={{ background: bg }}
      >
        {type === 'channel' ? (
          <span className={`${size === 'xs' ? 'text-sm' : size === 'sm' ? 'text-base' : 'text-xl'}`}>📢</span>
        ) : (
          <span className={`${s.text} font-bold`}>{getInitials(name)}</span>
        )}
      </div>
      {isOnline !== undefined && isOnline && (
        <div
          className={`absolute bottom-0 right-0 ${s.dot} rounded-full border-[#17212b] bg-[#4dcd5e]`}
        />
      )}
    </div>
  );
}
