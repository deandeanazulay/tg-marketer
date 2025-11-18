import { pgAppConfig, pgUserPrefs } from '../data/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { AppConfig, UserPreference } from '../data/types';

// Helper to decode JWT payload (simplified, no signature verification here)
function decodeJwtPayload(token: string): { telegram_id: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts, 'base64url').toString());
    return payload;
  } catch (e) {
    console.error('Failed to decode JWT payload:', e);
    return null;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    const token = authHeader.split(' ');
    const payload = decodeJwtPayload(token);

    if (!payload || !payload.telegram_id) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const telegramId = payload.telegram_id;

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return res.status(500).json({ error: 'DATABASE_URL not configured' });
    }

    const client = postgres(connectionString);
    const db = drizzle(client, { schema: { pgAppConfig, pgUserPrefs } });

    // Get App Config
    let appConfig: AppConfig | null = await db.query.pgAppConfig.findFirst({
      where: eq(pgAppConfig.app, 'miniapp'),
    });

    // Seed default config if not found
    if (!appConfig) {
      const defaultConfig: AppConfig['config'] = {
        adapters: { data: 'mock' },
        features: { someFeature: true },
        ui: { brand: 'TG Marketer', accent: '#0088cc' },
        defaults: { mode: 'demo' }
      };
      await db.insert(pgAppConfig).values({
        app: 'miniapp',
        config: defaultConfig,
        updated_at: new Date(),
      });
      appConfig = { app: 'miniapp', config: defaultConfig, updated_at: new Date() };
    }

    // Get User Preference
    const userPreference: UserPreference | null = await db.query.pgUserPrefs.findFirst({
      where: eq(pgUserPrefs.telegram_id, telegramId) && eq(pgUserPrefs.app, 'miniapp'),
    });

    res.json({
      app: 'miniapp',
      config: appConfig.config,
      user_mode: userPreference?.mode,
    });
  } catch (error) {
    console.error('Bootstrap error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}