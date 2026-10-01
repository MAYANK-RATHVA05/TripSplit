import React from 'react';

interface AvatarProps {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  color = '#4F46E5',
  size = 'md',
  className = ''
}) => {
  const getInitials = (n: string) => {
    if (!n) return '?';
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const sizeStyles: Record<string, { width: number; height: number; fontSize: string }> = {
    sm: { width: 28, height: 28, fontSize: '0.72rem' },
    md: { width: 36, height: 36, fontSize: '0.85rem' },
    lg: { width: 44, height: 44, fontSize: '1rem' },
    xl: { width: 56, height: 56, fontSize: '1.25rem' }
  };

  const style = sizeStyles[size] || sizeStyles.md;

  return (
    <div
      className={`avatar-circle ${className}`}
      style={{
        backgroundColor: color,
        width: `${style.width}px`,
        height: `${style.height}px`,
        fontSize: style.fontSize
      }}
      title={name}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
};
