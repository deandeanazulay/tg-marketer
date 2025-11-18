import React from 'react';
import { telegram } from '../lib/telegram';

interface ModeBadgeProps {
  mode: 'demo' | 'real' | null;
}

export function ModeBadge({ mode }: ModeBadgeProps) {
  if (!mode) return null;

  const theme = telegram.getTheme();
  
  return (
    <span 
      className="text-xs px-2.5 py-1 rounded-full font-medium shadow-sm backdrop-blur-sm"
      style={{ 
        backgroundColor: mode === 'demo' ? '#34c759' : theme.button_color,
        color: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
      }}
    >
      {mode === 'demo' ? '🧪 Demo' : '🚀 Live'}
    </span>
  );
}