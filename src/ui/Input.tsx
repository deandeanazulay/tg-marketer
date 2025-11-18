import React from 'react';
import { telegram } from '../lib/telegram';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'textarea';
  disabled?: boolean;
  className?: string;
  rows?: number;
  variant?: 'default' | 'filled';
}

export function Input({ 
  value, 
  onChange, 
  placeholder, 
  type = 'text', 
  disabled = false,
  className = '',
  rows = 3,
  variant = 'default'
}: InputProps) {
  const theme = telegram.getTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: theme.secondary_bg_color,
          color: theme.text_color,
          border: 'none'
        };
      default:
        return {
          backgroundColor: theme.bg_color,
          color: theme.text_color,
          borderColor: `${theme.hint_color}25`
        };
    }
  };

  const baseClasses = `
    w-full px-3 py-2.5 rounded-lg transition-all duration-150 text-sm
    focus:outline-none focus:ring-2 focus:ring-opacity-50
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${variant === 'filled' ? '' : 'border'}
    ${className}
  `;

  const focusStyle = {
    '--tw-ring-color': theme.button_color + '50'
  } as React.CSSProperties;

  if (type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        style={{ ...getVariantStyles(), ...focusStyle }}
        className={baseClasses + ' resize-none'}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{ ...getVariantStyles(), ...focusStyle }}
      className={baseClasses}
    />
  );
}