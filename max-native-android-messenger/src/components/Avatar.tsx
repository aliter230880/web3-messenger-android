import { getAvatarColorClass } from '../utils/helpers';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  avatar?: string;
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-[54px] h-[54px] text-lg',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-20 h-20 text-2xl',
};

const dotSizeMap = {
  sm: 'w-2.5 h-2.5 border',
  md: 'w-3.5 h-3.5 border-2',
  lg: 'w-4 h-4 border-2',
  xl: 'w-5 h-5 border-[3px]',
};

export function Avatar({ name, size = 'md', isOnline, avatar }: AvatarProps) {
  const colorClass = getAvatarColorClass(name);
  const initials = avatar || name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="relative flex-shrink-0">
      <div
        className={`${sizeMap[size]} ${colorClass} rounded-full flex items-center justify-center text-white font-medium select-none`}
      >
        {initials}
      </div>
      {isOnline !== undefined && (
        <div
          className={`absolute bottom-0 right-0 ${dotSizeMap[size]} rounded-full border-white dark:border-[#17212b] ${
            isOnline ? 'bg-[#4dcd5e]' : 'bg-gray-400'
          }`}
        />
      )}
    </div>
  );
}
