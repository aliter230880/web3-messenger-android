
import { generateAvatar, getInitials } from '../utils/wallet';

interface AvatarProps {
  address?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away';
  className?: string;
  groupCount?: number;
}

const sizes = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-11 h-11 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

const statusColors = {
  online: 'bg-green-400',
  offline: 'bg-gray-500',
  away: 'bg-yellow-400',
};

const statusSizes = {
  xs: 'w-2 h-2 border',
  sm: 'w-2.5 h-2.5 border',
  md: 'w-3 h-3 border-2',
  lg: 'w-3.5 h-3.5 border-2',
  xl: 'w-4 h-4 border-2',
};

export default function Avatar({
  address = '0x0000000000000000000000000000000000000000',
  name,
  size = 'md',
  status,
  className = '',
  groupCount,
}: AvatarProps) {
  const bg = generateAvatar(address);
  const initials = getInitials(name, address);

  if (groupCount !== undefined && groupCount > 1) {
    return (
      <div className={`relative flex-shrink-0 ${className}`}>
        <div
          className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white select-none`}
          style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
        >
          <span>👥</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white select-none`}
        style={{ background: bg }}
      >
        {initials}
      </div>
      {status && (
        <div
          className={`absolute bottom-0 right-0 ${statusColors[status]} ${statusSizes[size]} rounded-full border-gray-900`}
        />
      )}
    </div>
  );
}
