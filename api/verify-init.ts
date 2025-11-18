import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js'; // For Supabase client in serverless
import { pgProfiles } from '../data/schema'; // Import Drizzle schema
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

interface TelegramInitData {
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
  };
  auth_date: number;
  hash: string;
}

function verifyTelegramWebAppData(initData: string, botToken: string): TelegramInitData | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    if (!hash) return null;
    
    // Create data-check-string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Create secret key
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    
    // Calculate expected hash
    const expectedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    
    if (expectedHash !== hash) return null;
    
    // Parse data
    const userData = urlParams.get('user');
    const authDate = parseInt(urlParams.get('auth_date') || '0');
    
    // Check auth_date (within last hour)
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 3600) return null;
    
    return {
      user: userData ? JSON.parse(userData) : undefined,
      auth_date: authDate,
      hash
    };
  } catch (error) {
    console.error('Error verifying Telegram data:', error);
    return null;
  }
}

function generateJWT(payload: any): string {
  // This is a simplified JWT generation for demonstration.
  // In a production environment, use a robust JWT library like 'jsonwebtoken'.
  // The 'signature' part is missing here.
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + (24 * 60 * 60) // 24 hours
  };
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');
  
  // In a real implementation, you would sign this with a secret key.
  // For now, we'll use a placeholder signature.
  const signature = 'placeholder_signature'; 
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { initData } = req.body;
    
    if (!initData) {
      return res.status(400).json({ error: 'Missing initData' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    // Verify Telegram data
    const telegramData = verifyTelegramWebAppData(initData, botToken);
    if (!telegramData || !telegramData.user) {
      return res.status(401).json({ error: 'Invalid Telegram data' });
    }

    const telegramId = telegramData.user.id.toString();

    // Upsert user profile (using Drizzle with Postgres for example)
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      const client = postgres(connectionString);
      const db = drizzle(client, { schema: { pgProfiles } });
      
      await db.insert(pgProfiles)
        .values({
          telegram_id: telegramId,
          username: telegramData.user.username,
          first_name: telegramData.user.first_name,
          last_name: telegramData.user.last_name,
          language_code: telegramData.user.language_code,
          is_premium: telegramData.user.is_premium || false,
          role: 'user',
          updated_at: new Date(),
        })
        .onConflictDoUpdate({
          target: pgProfiles.telegram_id,
          set: {
            username: telegramData.user.username,
            first_name: telegramData.user.first_name,
            last_name: telegramData.user.last_name,
            language_code: telegramData.user.language_code,
            is_premium: telegramData.user.is_premium || false,
            updated_at: new Date(),
          },
        });
    } else {
      console.warn('DATABASE_URL not set. User profile not upserted.');
    }

    // Generate JWT
    const jwt = generateJWT({
      telegram_id: telegramId,
      username: telegramData.user.username,
      role: 'user'
    });

    res.json({
      success: true,
      user: telegramData.user,
      jwt,
      telegram_id: telegramId,
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}