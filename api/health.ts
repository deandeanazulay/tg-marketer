import { mcp__supabase__execute_sql } from '../services/supabase';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let workerCount = 0;

    try {
      const workerQuery = `
        SELECT COUNT(*) as count
        FROM worker_heartbeats
        WHERE status = 'online' AND last_heartbeat_at > now() - interval '5 minutes'
      `;
      const result = await mcp__supabase__execute_sql({ query: workerQuery });
      workerCount = result.rows?.[0]?.count || 0;
    } catch (e) {
      console.warn('Failed to fetch worker count:', e);
    }

    const health = {
      status: 'healthy',
      version: '2.0.0',
      database: 'supabase',
      workers: workerCount,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };

    res.status(200).json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}