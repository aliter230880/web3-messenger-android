import { getAvatarGradient, getInitials } from '../utils/web3';

interface AvatarProps {
  address: string;
  name: string;
  avatarId?: number | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: { outer: 'w-8 h-8', text: 'text-xs' },
  sm: { outer: 'w-10 h-10', text: 'text-sm' },
  md: { outer: 'w-12 h-12', text: 'text-base' },
  lg: { outer: 'w-14 h-14', text: 'text-lg' },
  xl: { outer: 'w-20 h-20', text: 'text-2xl' },
};

export default function Avatar({ address, name, size = 'md', className = '' }: AvatarProps) {
  const [from, to] = getAvatarGradient(address);
  const { outer, text } = sizeMap[size];

  return (
    <div
      className={`${outer} rounded-full flex items-center justify-center font-semibold text-white select-none flex-shrink-0 ${className}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <span className={text}>{getInitials(name)}</span>
    </div>
  );
}
