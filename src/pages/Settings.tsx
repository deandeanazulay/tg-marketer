import React, { useState, useEffect } from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { Toast } from '../components/Toast';
import { Button, Card, List, ListItem } from '../ui';
import { telegram } from '../lib/telegram';
import type { DataStore } from '../types';

interface SettingsProps {
  onManageAccounts: () => void;
  onManageSessions?: () => void;
}

export function Settings({ onManageAccounts, onManageSessions }: SettingsProps) {
  const [user, setUser] = useState(null);

  useTelegramUI({
    title: 'Settings'
  });

  useEffect(() => {
    // Get user from Telegram WebApp
    const telegramUser = telegram.getUser();
    if (telegramUser) {
      setUser(telegramUser as any);
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 text-center p-4 pb-2">
        <h1 
          className="text-2xl font-bold mb-1"
          style={{ color: telegram.getTheme().text_color }}
        >
          Settings
        </h1>
        <p className="text-sm" style={{ color: telegram.getTheme().hint_color }}>
          Manage your account and preferences
        </p>
      </div>

      <div className="flex-1 flex flex-col px-4 space-y-3">
      {/* Profile Card */}
      <Card variant="elevated" className="flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: telegram.getTheme().button_color }}
          >
            <span className="text-white text-lg">👤</span>
          </div>
          <div className="flex-1">
            <h3 
              className="text-base font-semibold"
              style={{ color: telegram.getTheme().text_color }}
            >
              {user?.first_name} {user?.last_name}
            </h3>
            {user?.username && (
              <p className="text-sm" style={{ color: telegram.getTheme().hint_color }}>
                @{user.username}
              </p>
            )}
            <p 
              className="text-sm"
              style={{ color: telegram.getTheme().hint_color }}
            >
              ID: {user?.id}
            </p>
          </div>
          {user?.is_premium && (
            <div 
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-400 text-black"
            >
              Premium
            </div>
          )}
        </div>
      </Card>

      {/* Settings List */}
      <List className="flex-shrink-0">
        <ListItem onClick={onManageAccounts}>
          <div className="flex items-center space-x-3">
            <span className="text-lg">📱</span>
            <span style={{ color: telegram.getTheme().text_color }}>Manage Accounts</span>
          </div>
        </ListItem>

        {onManageSessions && (
          <ListItem onClick={onManageSessions}>
            <div className="flex items-center space-x-3">
              <span className="text-lg">📁</span>
              <span style={{ color: telegram.getTheme().text_color }}>Session Manager</span>
            </div>
          </ListItem>
        )}

        <ListItem>
          <div className="flex items-center space-x-3">
            <span className="text-lg">🛡️</span>
            <span style={{ color: telegram.getTheme().text_color }}>Privacy Policy</span>
          </div>
        </ListItem>

        <ListItem>
          <div className="flex items-center space-x-3">
            <span className="text-lg">📄</span>
            <span style={{ color: telegram.getTheme().text_color }}>Terms of Service</span>
          </div>
        </ListItem>
      </List>

      {/* App Info */}
      <Card variant="outlined" className="flex-shrink-0">
        <div className="text-center">
          <h3
            className="text-base font-semibold mb-1"
            style={{ color: telegram.getTheme().text_color }}
          >
            TG Marketer
          </h3>
          <p
            className="text-sm mb-2"
            style={{ color: telegram.getTheme().hint_color }}
          >
            Version 2.1.0
          </p>
          <p
            className="text-xs"
            style={{ color: telegram.getTheme().hint_color }}
          >
            Telegram Campaign Manager
          </p>
        </div>
      </Card>
      </div>
    </div>
  );
}