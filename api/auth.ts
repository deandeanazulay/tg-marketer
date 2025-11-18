import { createHmac } from 'crypto';
import { mcp__supabase__execute_sql } from '../services/supabase';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

function generateJWT(payload: any, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + (7 * 24 * 60 * 60)
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');

  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function hashPassword(password: string): string {
  return createHmac('sha256', process.env.API_SECRET_KEY || 'default_secret')
    .update(password)
    .digest('hex');
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'POST') {
      const { action } = req.query;

      if (action === 'login') {
        const { email, password }: LoginRequest = req.body;

        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password required' });
        }

        const passwordHash = hashPassword(password);

        const query = `
          SELECT id, email, name, role, created_at
          FROM users
          WHERE email = '${email}' AND password_hash = '${passwordHash}' AND is_active = true
        `;

        const result = await mcp__supabase__execute_sql({ query });

        if (!result.rows || result.rows.length === 0) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const secret = process.env.API_SECRET_KEY || 'default_secret';

        const jwt = generateJWT({
          user_id: user.id,
          email: user.email,
          role: user.role
        }, secret);

        return res.json({
          success: true,
          jwt,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        });
      }

      if (action === 'register') {
        const { email, password, name }: RegisterRequest = req.body;

        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password required' });
        }

        const checkQuery = `
          SELECT id FROM users WHERE email = '${email}'
        `;

        const checkResult = await mcp__supabase__execute_sql({ query: checkQuery });

        if (checkResult.rows && checkResult.rows.length > 0) {
          return res.status(409).json({ error: 'Email already registered' });
        }

        const passwordHash = hashPassword(password);

        const insertQuery = `
          INSERT INTO users (email, password_hash, name, role, is_active, created_at, updated_at)
          VALUES ('${email}', '${passwordHash}', ${name ? `'${name}'` : 'NULL'}, 'user', true, now(), now())
          RETURNING id, email, name, role, created_at
        `;

        const result = await mcp__supabase__execute_sql({ query: insertQuery });

        if (!result.rows || result.rows.length === 0) {
          return res.status(500).json({ error: 'Failed to create user' });
        }

        const user = result.rows[0];
        const secret = process.env.API_SECRET_KEY || 'default_secret';

        const jwt = generateJWT({
          user_id: user.id,
          email: user.email,
          role: user.role
        }, secret);

        return res.json({
          success: true,
          jwt,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        });
      }

      if (action === 'verify') {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Authorization token required' });
        }

        const token = authHeader.split(' ')[1];

        try {
          const parts = token.split('.');
          if (parts.length !== 3) {
            return res.status(401).json({ error: 'Invalid token format' });
          }

          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

          if (payload.exp && Date.now() / 1000 > payload.exp) {
            return res.status(401).json({ error: 'Token expired' });
          }

          return res.json({
            success: true,
            user: {
              id: payload.user_id,
              email: payload.email,
              role: payload.role
            }
          });
        } catch (e) {
          return res.status(401).json({ error: 'Invalid token' });
        }
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Auth API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
