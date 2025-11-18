import { pgUserPrefs } from '../data/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { UserPreference } from '../data/types';

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
  if (!['POST', 'DELETE'].includes(req.method)) {
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

    if (req.method === 'DELETE') {
      // Clear user preference
      const client = postgres(connectionString);
      const db = drizzle(client, { schema: { pgUserPrefs } });

      await db.delete(pgUserPrefs)
        .where(eq(pgUserPrefs.telegram_id, payload.telegram_id) && eq(pgUserPrefs.app, 'miniapp'));

      return res.json({ success: true, message: 'User preference cleared' });
    }

    // POST method - set user preference
    const { telegram_id: requestTelegramId, mode } = req.body;

    if (payload.telegram_id !== requestTelegramId) {
      return res.status(403).json({ error: 'Unauthorized: Token does not match requested user' });
    }
    if (!['demo', 'real'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode specified. Must be "demo" or "real".' });
    }

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return res.status(500).json({ error: 'DATABASE_URL not configured' });
    }

    const client = postgres(connectionString);
    const db = drizzle(client, { schema: { pgUserPrefs } });

    await db.insert(pgUserPrefs)
      .values({
        telegram_id: requestTelegramId,
        app: 'miniapp', // Hardcode app name for now
        mode: mode,
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: [pgUserPrefs.telegram_id, pgUserPrefs.app],
        set: { mode, updated_at: new Date() },
      });

    res.json({ success: true, telegram_id: requestTelegramId, mode });
  } catch (error) {
    console.error('User mode update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}