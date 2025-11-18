import React from 'react';
import { telegram } from '../lib/telegram';

interface SkeletonProps {
  className?: string;
  lines?: number;
  variant?: 'default' | 'rounded' | 'circle';
  width?: string;
  height?: string;
}

export function Skeleton({ 
  className = '', 
  lines = 1, 
  variant = 'default',
  width,
  height 
}: SkeletonProps) {
  const theme = telegram.getTheme();
  
  const getVariantClass = () => {
    switch (variant) {
      case 'circle': return 'rounded-full';
      case 'rounded': return 'rounded-lg';
      default: return 'rounded';
    }
  };

  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 mb-2 ${i === lines - 1 ? 'mb-0' : ''} ${getVariantClass()}`}
          style={{ 
            backgroundColor: theme.hint_color + '15',
            width: width || (i === lines - 1 && lines > 1 ? '75%' : '100%'),
            height: height || '1rem'
          }}
        />
      ))}
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  showAvatar?: boolean;
}

export function SkeletonList({ count = 3, showAvatar = true }: SkeletonListProps) {
  const theme = telegram.getTheme();
  
  return (
    <div 
      className="rounded-2xl border overflow-hidden"
      style={{ 
        backgroundColor: theme.bg_color,
        borderColor: theme.hint_color + '20'
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`p-4 ${i < count - 1 ? 'border-b' : ''}`}
          style={{ borderColor: theme.hint_color + '15' }}
        >
          <div className="flex items-center space-x-3">
            {showAvatar && (
              <Skeleton 
                variant="circle" 
                width="2.5rem" 
                height="2.5rem" 
                className="flex-shrink-0"
              />
            )}
            <div className="flex-1">
              <Skeleton lines={2} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}