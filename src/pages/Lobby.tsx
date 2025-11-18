import React from 'react';
import { telegram } from '../lib/telegram';
import { Button, Card } from '../ui';

// Inline SVG components to replace lucide-react
const Play = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5,3 19,12 5,21" />
  </svg>
);

const Database = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
  </svg>
);

const Zap = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
  </svg>
);

const Users = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const MessageSquare = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const BarChart3 = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);

interface LobbyProps {
  onReady: () => void;
}

export function Lobby({ onReady }: LobbyProps) {
  const theme = telegram.getTheme();

  const features = [
    { icon: Users, label: 'Manage Destinations', desc: 'Add channels & groups' },
    { icon: MessageSquare, label: 'Create Templates', desc: 'Design messages' },
    { icon: Zap, label: 'Send Campaigns', desc: 'Bulk messaging' },
    { icon: BarChart3, label: 'Track Results', desc: 'Real-time stats' }
  ];

  React.useEffect(() => {
    const timer = setTimeout(() => {
      telegram.impact('light');
      onReady();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onReady]);

  return (
    <div className="p-4 space-y-6 min-h-screen flex flex-col justify-center">
      {/* Header */}
      <div className="text-center pb-4">
        <div
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center animate-pulse"
          style={{ backgroundColor: theme.button_color }}
        >
          <MessageSquare className="w-10 h-10 text-white" />
        </div>
        <h1
          className="text-3xl font-bold mb-3"
          style={{ color: theme.text_color }}
        >
          TG Marketer
        </h1>
        <p
          className="text-base mb-8"
          style={{ color: theme.hint_color }}
        >
          Telegram Campaign Manager
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 gap-3">
        {features.map((feature, index) => (
          <Card key={index} className="text-center py-4">
            <feature.icon
              className="w-6 h-6 mx-auto mb-2"
              style={{ color: theme.button_color }}
            />
            <h3
              className="font-medium text-sm mb-1"
              style={{ color: theme.text_color }}
            >
              {feature.label}
            </h3>
            <p
              className="text-xs"
              style={{ color: theme.hint_color }}
            >
              {feature.desc}
            </p>
          </Card>
        ))}
      </div>

      {/* Loading indicator */}
      <div className="text-center pt-6">
        <div className="inline-flex space-x-2">
          <div
            className="w-2 h-2 rounded-full animate-bounce"
            style={{
              backgroundColor: theme.button_color,
              animationDelay: '0ms'
            }}
          />
          <div
            className="w-2 h-2 rounded-full animate-bounce"
            style={{
              backgroundColor: theme.button_color,
              animationDelay: '150ms'
            }}
          />
          <div
            className="w-2 h-2 rounded-full animate-bounce"
            style={{
              backgroundColor: theme.button_color,
              animationDelay: '300ms'
            }}
          />
        </div>
        <p
          className="text-sm mt-4"
          style={{ color: theme.hint_color }}
        >
          Loading your workspace...
        </p>
      </div>
    </div>
  );
}