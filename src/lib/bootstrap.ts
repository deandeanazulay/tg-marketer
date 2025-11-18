import { telegram } from './telegram';
import { BootstrapConfig } from './types';

interface ClientBootstrapResult {
  cfg: BootstrapConfig;
  jwt: string;
  mode: 'demo' | 'real';
  telegramId: string;
}

export async function clientBootstrap(): Promise<ClientBootstrapResult> {
  const initData = telegram.getInitData();
  if (!initData) {
    throw new Error('Telegram initData is missing. Cannot authenticate.');
  }

  const apiUrl = import.meta.env.VITE_API_URL || '/api';

  // 1. Verify initData and get JWT
  const verifyResponse = await fetch(`${apiUrl}/verify-init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData }),
  });

  if (!verifyResponse.ok) {
    const error = await verifyResponse.json();
    throw new Error(`Failed to verify Telegram initData: ${error.error || verifyResponse.statusText}`);
  }
  const { jwt, telegram_id: telegramId } = await verifyResponse.json();

  // Store JWT for subsequent API calls
  localStorage.setItem('telegram_jwt', jwt);

  // 2. Get Bootstrap Config
  const bootstrapResponse = await fetch(`${apiUrl}/bootstrap`, {
    headers: { 'Authorization': `Bearer ${jwt}` },
  });

  if (!bootstrapResponse.ok) {
    const error = await bootstrapResponse.json();
    throw new Error(`Failed to load bootstrap config: ${error.error || bootstrapResponse.statusText}`);
  }
  const { config: cfg, user_mode: userMode } = await bootstrapResponse.json();

  // Determine initial mode: user preference > default config > 'demo'
  const mode: 'demo' | 'real' = userMode || cfg.defaults.mode || 'demo';

  return { cfg, jwt, mode, telegramId: telegramId.toString() };
}

export async function setUserModePreference(telegramId: string, mode: 'demo' | 'real'): Promise<void> {
  const jwt = localStorage.getItem('telegram_jwt');
  if (!jwt) {
    throw new Error('JWT not found. User not authenticated.');
  }

  const apiUrl = import.meta.env.VITE_API_URL || '/api';

  const response = await fetch(`${apiUrl}/user-mode`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
    body: JSON.stringify({ telegram_id: telegramId, mode }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to set user mode preference: ${error.error || response.statusText}`);
  }
}