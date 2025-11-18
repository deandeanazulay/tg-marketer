import React from 'react';
import { telegram } from '../lib/telegram';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
}

export function Card({ children, className = '', onClick, variant = 'default' }: CardProps) {
  const theme = telegram.getTheme();

  const handleClick = () => {
    if (onClick) {
      telegram.impact('light');
      onClick();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: theme.bg_color,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
          border: 'none'
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          border: `1px solid ${theme.hint_color}20`
        };
      default:
        return {
          backgroundColor: theme.bg_color,
          border: `1px solid ${theme.hint_color}15`
        };
    }
  };
  return (
    <div
      onClick={handleClick}
      style={getVariantStyles()}
      className={`
        rounded-xl p-3 transition-all duration-150
        ${onClick ? 'cursor-pointer active:scale-[0.99] active:opacity-90' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}