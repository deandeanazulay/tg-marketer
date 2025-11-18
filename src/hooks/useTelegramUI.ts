import { useEffect } from 'react';
import { telegram } from '../lib/telegram';

interface TelegramUIConfig {
  title?: string;
  mainButton?: {
    text: string;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
  };
  backButton?: {
    onClick: () => void;
  };
}

export function useTelegramUI(config: TelegramUIConfig) {
  const { title, mainButton, backButton } = config;

  useEffect(() => {
    // Set title if provided
    if (title && typeof document !== 'undefined') {
      document.title = title;
    }

    // Configure MainButton
    if (mainButton) {
      telegram.showMainButton(mainButton.text, mainButton.onClick);
      telegram.setMainButtonLoading(mainButton.loading || false);
    } else {
      telegram.hideMainButton();
    }

    // Configure BackButton
    if (backButton) {
      telegram.showBackButton(backButton.onClick);
    } else {
      telegram.hideBackButton();
    }

    // Cleanup on unmount
    return () => {
      telegram.hideMainButton();
      telegram.hideBackButton();
    };
  }, [title, mainButton, backButton]);
}