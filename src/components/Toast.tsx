import { telegram } from '../lib/telegram';

export class Toast {
  static show(message: string, type: 'success' | 'error' | 'info' = 'info') {
    telegram.impact('light');
    
    if (type === 'error') {
      telegram.showAlert(`❌ ${message}`);
    } else if (type === 'success') {
      telegram.showAlert(`✅ ${message}`);
    } else {
      telegram.showAlert(message);
    }
  }

  static error(message: string) {
    this.show(message, 'error');
  }

  static success(message: string) {
    this.show(message, 'success');
  }

  static async confirm(message: string): Promise<boolean> {
    return telegram.showConfirm(message);
  }
}