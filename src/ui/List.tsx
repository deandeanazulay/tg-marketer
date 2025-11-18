import React from 'react';
import { telegram } from '../lib/telegram';

interface ListItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  subtitle?: string;
  rightElement?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'compact';
}

export function ListItem({ 
  children, 
  onClick, 
  subtitle, 
  rightElement,
  className = '',
  variant = 'default'
}: ListItemProps) {
  const theme = telegram.getTheme();

  const handleClick = () => {
    if (onClick) {
      telegram.impact('light');
      onClick();
    }
  };

  const padding = variant === 'compact' ? 'p-2.5' : 'p-3';
  
  return (
    <div
      onClick={handleClick}
      style={{
        backgroundColor: onClick ? (theme.secondary_bg_color || theme.bg_color) : theme.bg_color,
        borderColor: `${theme.hint_color}08`
      }}
      className={`
        flex items-center justify-between ${padding} border-b last:border-b-0 transition-all duration-100
        ${onClick ? 'cursor-pointer active:scale-[0.995]' : ''}
        ${className}
      `}
    >
      <div className="flex-1 min-w-0">
        <div 
          style={{ color: theme.text_color }}
          className="font-medium truncate leading-tight text-sm"
        >
          {children}
        </div>
        {subtitle && (
          <div 
            style={{ color: theme.hint_color }}
            className="text-xs mt-0.5 truncate leading-tight"
          >
            {subtitle}
          </div>
        )}
      </div>
      {rightElement && (
        <div className="ml-2 flex-shrink-0">
          {rightElement}
        </div>
      )}
    </div>
  );
}

interface ListProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'inset';
}

export function List({ children, className = '', variant = 'default' }: ListProps) {
  const theme = telegram.getTheme();
  const borderRadius = variant === 'inset' ? 'rounded-xl' : 'rounded-lg';
  
  return (
    <div
      style={{
        backgroundColor: theme.bg_color,
        borderColor: `${theme.hint_color}10`
      }}
      className={`${borderRadius} border overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}