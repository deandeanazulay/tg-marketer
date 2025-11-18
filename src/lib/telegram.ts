import { 
  initData, 
  miniApp, 
  themeParams, 
  viewport,
  mainButton,
  backButton,
  hapticFeedback
} from '@telegram-apps/sdk';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramTheme {
  bg_color: string;
  text_color: string;
  hint_color: string;
  link_color: string;
  button_color: string;
  button_text_color: string;
  secondary_bg_color: string;
}

class TelegramWebApp {
  private initialized = false;
  
  isAvailable(): boolean {
    return !!(window.Telegram?.WebApp && window.Telegram.WebApp.initDataUnsafe?.user);
  }
  
  async init(): Promise<boolean> { // Returns true if running in Telegram, false otherwise
    if (this.initialized) return true;
    
    if (window.Telegram?.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
      // Check if running in Telegram
      if (!window.Telegram?.WebApp) {
        throw new Error('Not running in Telegram Web App');
      }

      // Initialize SDK components
      miniApp.mount();
      viewport.mount();
      themeParams.mount();
      initData.restore();
      mainButton.mount();
      backButton.mount();
      hapticFeedback.mount();

      // Expand viewport
      viewport.expand();
      
      // Ready signal
      miniApp.ready();
      
      this.initialized = true;
      return true;
    } else {
      console.warn('Not running in Telegram Web App or initData is missing.');
      return false;
    }
  }

  getInitData(): string | null {
    return initData.raw();
  }

  getUser(): TelegramUser | null {
    const user = initData.user();
    return user ? {
      id: user.id,
      first_name: user.firstName,
      last_name: user.lastName,
      username: user.username,
      language_code: user.languageCode,
      is_premium: user.isPremium
    } : null;
  }

  getTheme(): TelegramTheme {
    // Return default theme if not initialized or not in Telegram environment
    if (!this.initialized || !window.Telegram?.WebApp) {
      return {
        bg_color: '#ffffff',
        text_color: '#000000',
        hint_color: '#999999',
        link_color: '#2481cc',
        button_color: '#2481cc',
        button_text_color: '#ffffff',
        secondary_bg_color: '#f1f1f1'
      };
    }

    return {
      bg_color: themeParams.backgroundColor || '#ffffff',
      text_color: themeParams.textColor || '#000000',
      hint_color: themeParams.hintColor || '#999999',
      link_color: themeParams.linkColor || '#2481cc',
      button_color: themeParams.buttonColor || '#2481cc',
      button_text_color: themeParams.buttonTextColor || '#ffffff',
      secondary_bg_color: themeParams.secondaryBackgroundColor || '#f1f1f1'
    };
  }

  // Main Button controls
  showMainButton(text: string, onClick: () => void): void {
    if (!mainButton.isMounted()) return;
    mainButton.setText(text);
    mainButton.onClick(onClick);
    mainButton.show();
  }

  hideMainButton(): void {
    if (!mainButton.isMounted()) return;
    mainButton.hide();
  }

  setMainButtonLoading(loading: boolean): void {
    if (!mainButton.isMounted()) return;
    if (loading) {
      mainButton.showProgress();
    } else {
      mainButton.hideProgress();
    }
  }

  // Back Button controls
  showBackButton(onClick: () => void): void {
    if (!backButton.isMounted()) return;
    backButton.onClick(onClick);
    backButton.show();
  }

  hideBackButton(): void {
    if (!backButton.isMounted()) return;
    backButton.hide();
  }

  // Haptic feedback
  impact(style: 'light' | 'medium' | 'heavy' = 'light'): void {
    if (!this.initialized || !this.isAvailable()) return;
    hapticFeedback.impactOccurred(style);
  }

  // Alerts
  showAlert(message: string): void {
    if (this.initialized && this.isAvailable()) {
      miniApp.showAlert(message);
    } else {
      alert(message);
    }
  }

  showConfirm(message: string): Promise<boolean> {
    if (this.initialized && this.isAvailable()) {
      return new Promise((resolve) => {
        miniApp.showConfirm(message, resolve);
      });
    } else {
      return Promise.resolve(confirm(message));
    }
  }

  // Close app
  close(): void {
    miniApp.close();
  }
}

export const telegram = new TelegramWebApp();