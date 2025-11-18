import type { APIRoute } from '../types/api';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export const GET: APIRoute = async ({ request, params }) => {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const sessionId = url.searchParams.get('id');
  const userId = url.searchParams.get('user_id');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    switch (action) {
      case 'list': {
        const { data, error } = await supabase
          .from('session_folders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({ sessions: data }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'get': {
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'Session ID required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const { data, error } = await supabase
          .from('session_folders')
          .select('*')
          .eq('id', sessionId)
          .eq('user_id', userId)
          .maybeSingle();

        if (error) throw error;

        return new Response(JSON.stringify({ session: data }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'stats': {
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'Session ID required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const { data, error } = await supabase
          .from('session_script_stats')
          .select('*')
          .eq('session_id', sessionId)
          .maybeSingle();

        if (error) throw error;

        return new Response(JSON.stringify({ stats: data }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'logs': {
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'Session ID required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const limit = parseInt(url.searchParams.get('limit') || '50');

        const { data, error } = await supabase
          .from('session_script_logs')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        return new Response(JSON.stringify({ logs: data }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'check-files': {
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'Session ID required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const { data: session } = await supabase
          .from('session_folders')
          .select('folder_path, telegram_user_id')
          .eq('id', sessionId)
          .eq('user_id', userId)
          .maybeSingle();

        if (!session) {
          return new Response(JSON.stringify({ error: 'Session not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const fs = await import('fs').then(m => m.promises);
        const path = await import('path');

        const folderPath = session.folder_path;
        const telegramExePath = path.join(folderPath, 'telegram.exe');
        const sessionFilePath = path.join(folderPath, `${session.telegram_user_id}.session`);

        const [telegramExeExists, sessionFileExists] = await Promise.all([
          fs.access(telegramExePath).then(() => true).catch(() => false),
          fs.access(sessionFilePath).then(() => true).catch(() => false)
        ]);

        await supabase
          .from('session_folders')
          .update({
            telegram_exe_present: telegramExeExists,
            session_file_present: sessionFileExists
          })
          .eq('id', sessionId)
          .eq('user_id', userId);

        return new Response(JSON.stringify({
          telegram_exe_present: telegramExeExists,
          session_file_present: sessionFileExists
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error: any) {
    console.error('Sessions API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, user_id } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    switch (action) {
      case 'create': {
        const { telegram_user_id, display_name, folder_path } = body;

        if (!telegram_user_id || !display_name) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const finalFolderPath = folder_path || `sessions/${telegram_user_id}`;

        const fs = await import('fs').then(m => m.promises);
        await fs.mkdir(finalFolderPath, { recursive: true });

        const { data, error } = await supabase
          .from('session_folders')
          .insert({
            user_id,
            telegram_user_id,
            display_name,
            folder_path: finalFolderPath,
            status: 'inactive'
          })
          .select()
          .single();

        if (error) throw error;

        await supabase
          .from('session_script_stats')
          .insert({
            session_id: data.id,
            messages_sent: 0,
            messages_failed: 0,
            groups_targeted: 0
          });

        return new Response(JSON.stringify({ session: data }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'update': {
        const { session_id, updates } = body;

        if (!session_id) {
          return new Response(JSON.stringify({ error: 'Session ID required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const { data, error } = await supabase
          .from('session_folders')
          .update(updates)
          .eq('id', session_id)
          .eq('user_id', user_id)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ session: data }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'log': {
        const { session_id, log_level, message, details } = body;

        if (!session_id || !message) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const { data, error } = await supabase
          .from('session_script_logs')
          .insert({
            session_id,
            log_level: log_level || 'info',
            message,
            details: details || {}
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ log: data }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'update-stats': {
        const { session_id, messages_sent, messages_failed, groups_targeted } = body;

        if (!session_id) {
          return new Response(JSON.stringify({ error: 'Session ID required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const { data: currentStats } = await supabase
          .from('session_script_stats')
          .select('*')
          .eq('session_id', session_id)
          .maybeSingle();

        const updates: any = {};
        if (messages_sent !== undefined) updates.messages_sent = (currentStats?.messages_sent || 0) + messages_sent;
        if (messages_failed !== undefined) updates.messages_failed = (currentStats?.messages_failed || 0) + messages_failed;
        if (groups_targeted !== undefined) updates.groups_targeted = groups_targeted;

        const { data, error } = await supabase
          .from('session_script_stats')
          .update(updates)
          .eq('session_id', session_id)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ stats: data }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error: any) {
    console.error('Sessions API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('id');
  const userId = url.searchParams.get('user_id');

  if (!sessionId || !userId) {
    return new Response(JSON.stringify({ error: 'Session ID and User ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { error } = await supabase
      .from('session_folders')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Sessions API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};