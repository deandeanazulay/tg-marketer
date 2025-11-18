import { mcp__supabase__execute_sql } from '../services/supabase';

function decodeJwtPayload(token: string): { user_id: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }

    return payload;
  } catch (e) {
    console.error('Failed to decode JWT payload:', e);
    return null;
  }
}

export default async function handler(req: any, res: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  const payload = decodeJwtPayload(token);

  if (!payload || !payload.user_id) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    // GET - List all sending accounts
    if (req.method === 'GET') {
      const { status, is_active } = req.query;

      let query = `
        SELECT
          id, label, session_key, phone, is_active, is_premium,
          hourly_limit, daily_limit, hourly_sent, daily_sent,
          hourly_reset_at, daily_reset_at, last_active_at,
          status, last_error, last_cooldown_until as flood_wait_until,
          created_at, updated_at
        FROM tg_accounts
        WHERE 1=1
      `;

      if (status) {
        query += ` AND status = '${status}'`;
      }

      if (is_active !== undefined) {
        query += ` AND is_active = ${is_active === 'true'}`;
      }

      query += ' ORDER BY created_at DESC';

      const result = await mcp__supabase__execute_sql({ query });
      return res.json(result.rows || []);
    }

    // POST - Create new sending account
    if (req.method === 'POST') {
      const {
        label,
        session_key,
        phone,
        api_id,
        api_hash_enc,
        is_premium = false,
        hourly_limit = 50,
        daily_limit = 200
      } = req.body;

      if (!label || !session_key) {
        return res.status(400).json({ error: 'label and session_key are required' });
      }

      // Create encrypted session blob (placeholder for now - worker will handle actual session)
      const session_blob_enc = Buffer.from('placeholder_session');

      const query = `
        INSERT INTO tg_accounts (
          label, session_key, phone, session_blob_enc,
          is_premium, hourly_limit, daily_limit,
          is_active, status, hourly_reset_at, daily_reset_at
        ) VALUES (
          '${label}', '${session_key}', ${phone ? `'${phone}'` : 'NULL'},
          $1, ${is_premium}, ${hourly_limit}, ${daily_limit},
          true, 'idle',
          now() + interval '1 hour',
          now() + interval '1 day'
        )
        RETURNING id, label, session_key, phone, is_active, status, created_at
      `;

      const result = await mcp__supabase__execute_sql({ query });
      return res.status(201).json(result.rows[0]);
    }

    // PUT - Update sending account
    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Account ID required' });
      }

      const {
        label,
        is_active,
        hourly_limit,
        daily_limit,
        status,
        last_error,
        flood_wait_until
      } = req.body;

      const updates: string[] = [];
      if (label !== undefined) updates.push(`label = '${label}'`);
      if (is_active !== undefined) updates.push(`is_active = ${is_active}`);
      if (hourly_limit !== undefined) updates.push(`hourly_limit = ${hourly_limit}`);
      if (daily_limit !== undefined) updates.push(`daily_limit = ${daily_limit}`);
      if (status !== undefined) updates.push(`status = '${status}'`);
      if (last_error !== undefined) updates.push(`last_error = '${last_error}'`);
      if (flood_wait_until !== undefined) {
        updates.push(`last_cooldown_until = ${flood_wait_until ? `'${flood_wait_until}'` : 'NULL'}`);
      }
      updates.push(`updated_at = now()`);

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const query = `
        UPDATE tg_accounts
        SET ${updates.join(', ')}
        WHERE id = '${id}'
        RETURNING id, label, session_key, status, updated_at
      `;

      const result = await mcp__supabase__execute_sql({ query });
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Account not found' });
      }

      return res.json(result.rows[0]);
    }

    // DELETE - Mark account as inactive
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Account ID required' });
      }

      const query = `
        UPDATE tg_accounts
        SET is_active = false, status = 'inactive', updated_at = now()
        WHERE id = '${id}'
        RETURNING id
      `;

      const result = await mcp__supabase__execute_sql({ query });
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Account not found' });
      }

      return res.json({ success: true, id: result.rows[0].id });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Accounts API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
