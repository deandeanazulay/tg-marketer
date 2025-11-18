import React from 'react';
import { telegram } from '../lib/telegram';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}

export function Button({ 
  children, 
  onClick, 
  variant = 'secondary', 
  size = 'medium', 
  disabled = false,
  className = '',
  fullWidth = false
}: ButtonProps) {
  const theme = telegram.getTheme();

  const handleClick = () => {
    if (!disabled && onClick) {
      telegram.impact('light');
      onClick();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.button_color,
          color: theme.button_text_color,
          border: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
        };
      case 'destructive':
        return {
          backgroundColor: '#ff3b30',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 1px 3px rgba(255,59,48,0.3)'
        };
      default:
        return {
          backgroundColor: theme.secondary_bg_color,
          color: theme.text_color,
          border: `1px solid ${theme.hint_color}20`
        };
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'px-3 py-1.5 text-sm';
      case 'large': return 'px-6 py-3 text-base';
      default: return 'px-4 py-2.5 text-sm';
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={getVariantStyles()}
      className={`
        ${getSizeClass()}
        font-medium rounded-lg transition-all duration-150
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
}