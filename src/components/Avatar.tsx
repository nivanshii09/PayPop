import { getInitials } from '@/lib/aiEngine';

interface AvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ name, color, size = 'md' }: AvatarProps) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  };

  return (
    <div
      className={`${sizes[size]} rounded-xl flex items-center justify-center font-semibold shrink-0`}
      style={{
        background: `${color}20`,
        border: `1px solid ${color}50`,
        color,
      }}
    >
      {getInitials(name)}
    </div>
  );
}
