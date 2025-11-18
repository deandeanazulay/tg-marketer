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
  onModeSelect: (mode: 'demo' | 'real') => void;
}

export function Lobby({ onModeSelect }: LobbyProps) {
  const theme = telegram.getTheme();

  const handleModeSelect = (mode: 'demo' | 'real') => {
    telegram.impact('medium');
    onModeSelect(mode);
  };

  const features = [
    { icon: Users, label: 'Manage Destinations', desc: 'Add channels & groups' },
    { icon: MessageSquare, label: 'Create Templates', desc: 'Design messages' },
    { icon: Zap, label: 'Send Campaigns', desc: 'Bulk messaging' },
    { icon: BarChart3, label: 'Track Results', desc: 'Real-time stats' }
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center pt-8 pb-4">
        <div 
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: theme.button_color }}
        >
          <MessageSquare className="w-8 h-8 text-white" />
        </div>
        <h1 
          className="text-2xl font-bold mb-2"
          style={{ color: theme.text_color }}
        >
          TG Marketer
        </h1>
        <p 
          className="text-sm"
          style={{ color: theme.hint_color }}
        >
          Telegram Campaign Manager
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 gap-3 mb-8">
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

      {/* Mode Selection */}
      <div className="space-y-4">
        <h2 
          className="text-lg font-semibold text-center mb-4"
          style={{ color: theme.text_color }}
        >
          Choose Your Experience
        </h2>

        {/* Demo Mode */}
        <Card className="p-6">
          <div className="flex items-start space-x-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#34c759' + '20' }}
            >
              <Play 
                className="w-6 h-6" 
                style={{ color: '#34c759' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 
                className="font-semibold mb-2"
                style={{ color: theme.text_color }}
              >
                Demo Mode
              </h3>
              <p 
                className="text-sm mb-4"
                style={{ color: theme.hint_color }}
              >
                Explore all features with sample data. Perfect for testing and learning the interface.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {['✨ Sample Templates', '📱 Mock Destinations', '📊 Fake Stats'].map((tag) => (
                  <span 
                    key={tag}
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ 
                      backgroundColor: theme.secondary_bg_color,
                      color: theme.hint_color
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <Button 
                variant="secondary" 
                onClick={() => handleModeSelect('demo')}
                className="w-full"
              >
                Try Demo
              </Button>
            </div>
          </div>
        </Card>

        {/* Real App Mode */}
        <Card className="p-6">
          <div className="flex items-start space-x-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: theme.button_color + '20' }}
            >
              <Database 
                className="w-6 h-6" 
                style={{ color: theme.button_color }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 
                className="font-semibold mb-2"
                style={{ color: theme.text_color }}
              >
                Real App
              </h3>
              <p 
                className="text-sm mb-4"
                style={{ color: theme.hint_color }}
              >
                Connect to your bot and database. Send real messages to your channels and groups.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {['🤖 Your Bot', '💾 Real Database', '📤 Live Sending'].map((tag) => (
                  <span 
                    key={tag}
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ 
                      backgroundColor: theme.button_color + '20',
                      color: theme.button_color
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <Button 
                variant="primary" 
                onClick={() => handleModeSelect('real')}
                className="w-full"
              >
                Use Real App
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center pt-4">
        <p 
          className="text-xs"
          style={{ color: theme.hint_color }}
        >
          Both modes have identical features and interface
        </p>
      </div>
    </div>
  );
}