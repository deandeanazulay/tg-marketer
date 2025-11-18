// Telegram-native spacing and sizing tokens
export const SPACING = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px  
  md: '1rem',      // 16px - Telegram standard
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
} as const;

export const COLORS = {
  telegram: {
    blue: '#0088cc',
    lightBlue: '#54a9eb',
    navy: '#2c5aa0',
    gray: '#f4f4f5',
    green: '#34c759',
    red: '#ff3b30',
  }
} as const;

export const LIMITS = {
  listPageSize: 20,
  maxRetries: 3,
  toastDuration: 3000,
} as const;