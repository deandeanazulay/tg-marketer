import { mcp__supabase__execute_sql } from '../services/supabase';

function decodeJwtPayload(token: string): { telegram_id: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
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

  if (!payload || !payload.telegram_id) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { action } = req.query;

  try {
    // Worker polling for pending jobs
    if (action === 'pending-jobs' && req.method === 'GET') {
      const { limit = 10, account_id, worker_id } = req.query;

      let query = `
        SELECT
          j.id, j.campaign_id, j.account_id, j.session_key,
          j.chat_id, j.status, j.attempt_count, j.scheduled_for,
          j.error_message, j.worker_id,
          a.label as account_label, a.status as account_status,
          a.hourly_sent, a.hourly_limit, a.daily_sent, a.daily_limit,
          a.last_cooldown_until as flood_wait_until,
          c.id as chat_id_bigint, c.title as chat_title,
          camp.name as campaign_name,
          t.text_md as template_text
        FROM jobs j
        LEFT JOIN tg_accounts a ON j.account_id = a.id
        LEFT JOIN tg_chats c ON j.chat_id = c.id
        LEFT JOIN campaigns camp ON j.campaign_id = camp.id
        LEFT JOIN msg_templates t ON camp.template_id = t.id
        WHERE j.status = 'queued'
          AND j.scheduled_for <= now()
          AND (a.is_active = true OR a.is_active IS NULL)
          AND (a.last_cooldown_until IS NULL OR a.last_cooldown_until < now())
          AND (a.hourly_sent < a.hourly_limit OR a.hourly_limit IS NULL)
          AND (a.daily_sent < a.daily_limit OR a.daily_limit IS NULL)
      `;

      if (account_id) {
        query += ` AND j.account_id = '${account_id}'`;
      }

      query += ` ORDER BY j.scheduled_for ASC LIMIT ${limit}`;

      const result = await mcp__supabase__execute_sql({ query });

      // Update status to 'assigned' and set worker_id
      if (result.rows && result.rows.length > 0 && worker_id) {
        const jobIds = result.rows.map((row: any) => `'${row.id}'`).join(',');
        await mcp__supabase__execute_sql({
          query: `
            UPDATE jobs
            SET status = 'assigned', worker_id = '${worker_id}', claimed_at = now()
            WHERE id IN (${jobIds})
          `
        });
      }

      return res.json({
        jobs: result.rows || [],
        count: result.rows?.length || 0
      });
    }

    // Worker heartbeat
    if (action === 'heartbeat' && req.method === 'POST') {
      const {
        worker_id,
        hostname,
        version = '1.0.0',
        active_accounts = [],
        stats = {}
      } = req.body;

      if (!worker_id || !hostname) {
        return res.status(400).json({ error: 'worker_id and hostname required' });
      }

      const query = `
        INSERT INTO worker_heartbeats (
          worker_id, hostname, version, status, active_accounts, stats, last_heartbeat_at
        ) VALUES (
          '${worker_id}', '${hostname}', '${version}', 'online',
          '${JSON.stringify(active_accounts)}'::jsonb,
          '${JSON.stringify(stats)}'::jsonb,
          now()
        )
        ON CONFLICT (worker_id)
        DO UPDATE SET
          hostname = EXCLUDED.hostname,
          version = EXCLUDED.version,
          status = 'online',
          active_accounts = EXCLUDED.active_accounts,
          stats = EXCLUDED.stats,
          last_heartbeat_at = now()
        RETURNING worker_id, status, last_heartbeat_at
      `;

      const result = await mcp__supabase__execute_sql({ query });
      return res.json(result.rows[0]);
    }

    // Update job status
    if (action === 'update-job' && req.method === 'POST') {
      const { job_id, status, error_message, sent_at } = req.body;

      if (!job_id || !status) {
        return res.status(400).json({ error: 'job_id and status required' });
      }

      // Build update query
      const updates: string[] = [`status = '${status}'`];

      if (error_message) {
        updates.push(`error_message = '${error_message.replace(/'/g, "''")}'`);
      }

      if (status === 'running') {
        updates.push(`attempt_count = attempt_count + 1`);
      }

      const query = `
        UPDATE jobs
        SET ${updates.join(', ')}
        WHERE id = '${job_id}'
        RETURNING id, status, attempt_count
      `;

      const result = await mcp__supabase__execute_sql({ query });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // If job completed successfully, update account statistics
      if (status === 'done') {
        const jobResult = await mcp__supabase__execute_sql({
          query: `
            SELECT account_id FROM jobs WHERE id = '${job_id}'
          `
        });

        if (jobResult.rows && jobResult.rows[0]?.account_id) {
          await mcp__supabase__execute_sql({
            query: `
              UPDATE tg_accounts
              SET
                hourly_sent = hourly_sent + 1,
                daily_sent = daily_sent + 1,
                last_active_at = now(),
                updated_at = now()
              WHERE id = '${jobResult.rows[0].account_id}'
            `
          });
        }
      }

      // If job failed permanently, mark it
      if (status === 'failed') {
        const jobResult = await mcp__supabase__execute_sql({
          query: `SELECT attempt_count FROM jobs WHERE id = '${job_id}'`
        });

        // If max attempts reached, don't retry
        if (jobResult.rows && jobResult.rows[0]?.attempt_count >= 3) {
          await mcp__supabase__execute_sql({
            query: `UPDATE jobs SET status = 'failed_permanent' WHERE id = '${job_id}'`
          });
        } else {
          // Reschedule for retry
          await mcp__supabase__execute_sql({
            query: `
              UPDATE jobs
              SET
                status = 'queued',
                worker_id = NULL,
                scheduled_for = now() + interval '5 minutes'
              WHERE id = '${job_id}'
            `
          });
        }
      }

      return res.json(result.rows[0]);
    }

    // Update account status (for FloodWait, errors, etc.)
    if (action === 'update-account' && req.method === 'POST') {
      const { account_id, status, error_message, flood_wait_until } = req.body;

      if (!account_id) {
        return res.status(400).json({ error: 'account_id required' });
      }

      const updates: string[] = ['updated_at = now()'];

      if (status) updates.push(`status = '${status}'`);
      if (error_message) {
        updates.push(`last_error = '${error_message.replace(/'/g, "''")}'`);
      }
      if (flood_wait_until) {
        updates.push(`last_cooldown_until = '${flood_wait_until}'`);
      }

      const query = `
        UPDATE tg_accounts
        SET ${updates.join(', ')}
        WHERE id = '${account_id}'
        RETURNING id, status, updated_at
      `;

      const result = await mcp__supabase__execute_sql({ query });
      return res.json(result.rows[0] || {});
    }

    // Get worker statistics
    if (action === 'stats' && req.method === 'GET') {
      const { worker_id } = req.query;

      const queries = {
        workers: `SELECT * FROM worker_heartbeats ${worker_id ? `WHERE worker_id = '${worker_id}'` : ''} ORDER BY last_heartbeat_at DESC`,
        pending_jobs: `SELECT COUNT(*) as count FROM jobs WHERE status = 'queued'`,
        running_jobs: `SELECT COUNT(*) as count FROM jobs WHERE status IN ('assigned', 'running')`,
        completed_today: `SELECT COUNT(*) as count FROM jobs WHERE status = 'done' AND claimed_at >= CURRENT_DATE`,
        failed_today: `SELECT COUNT(*) as count FROM jobs WHERE status LIKE 'failed%' AND claimed_at >= CURRENT_DATE`,
        active_accounts: `SELECT COUNT(*) as count FROM tg_accounts WHERE is_active = true AND status != 'error'`
      };

      const results: any = {};
      for (const [key, query] of Object.entries(queries)) {
        const result = await mcp__supabase__execute_sql({ query });
        results[key] = result.rows;
      }

      return res.json(results);
    }

    return res.status(400).json({ error: 'Invalid action or method' });

  } catch (error: any) {
    console.error('Worker API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
