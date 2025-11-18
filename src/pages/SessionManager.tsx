import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { telegram } from '../lib/telegram';
import type { SessionFolder, SessionScriptStats, SessionScriptLog } from '../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

interface SessionManagerProps {
  onBack: () => void;
  userId: string;
}

export function SessionManager({ onBack, userId }: SessionManagerProps) {
  const [sessions, setSessions] = useState<SessionFolder[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionFolder | null>(null);
  const [stats, setStats] = useState<SessionScriptStats | null>(null);
  const [logs, setLogs] = useState<SessionScriptLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSession, setNewSession] = useState({
    telegram_user_id: '',
    display_name: '',
    folder_path: ''
  });

  const theme = telegram.getTheme();

  useEffect(() => {
    loadSessions();
  }, [userId]);

  useEffect(() => {
    if (selectedSession) {
      loadSessionDetails(selectedSession.id);
    }
  }, [selectedSession]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('session_folders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      telegram.showAlert('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (sessionId: string) => {
    try {
      const [statsResult, logsResult] = await Promise.all([
        supabase
          .from('session_script_stats')
          .select('*')
          .eq('session_id', sessionId)
          .maybeSingle(),
        supabase
          .from('session_script_logs')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      if (statsResult.data) setStats(statsResult.data);
      if (logsResult.data) setLogs(logsResult.data);
    } catch (error) {
      console.error('Error loading session details:', error);
    }
  };

  const createSession = async () => {
    if (!newSession.telegram_user_id || !newSession.display_name) {
      telegram.showAlert('Please fill in all required fields');
      return;
    }

    const folderPath = newSession.folder_path ||
      `sessions/${newSession.telegram_user_id}`;

    try {
      const { data, error } = await supabase
        .from('session_folders')
        .insert({
          user_id: userId,
          telegram_user_id: newSession.telegram_user_id,
          display_name: newSession.display_name,
          folder_path: folderPath,
          status: 'inactive'
        })
        .select()
        .single();

      if (error) throw error;

      telegram.impact('medium');
      setShowCreateModal(false);
      setNewSession({ telegram_user_id: '', display_name: '', folder_path: '' });
      loadSessions();
    } catch (error: any) {
      console.error('Error creating session:', error);
      telegram.showAlert(error.message || 'Failed to create session');
    }
  };

  const deleteSession = async (sessionId: string) => {
    const confirmed = await telegram.showConfirm('Delete this session folder?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('session_folders')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;

      telegram.impact('medium');
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
      loadSessions();
    } catch (error: any) {
      console.error('Error deleting session:', error);
      telegram.showAlert(error.message || 'Failed to delete session');
    }
  };

  const toggleScript = async (session: SessionFolder) => {
    const newStatus = session.script_status === 'running' ? 'stopped' : 'running';

    try {
      const { error } = await supabase
        .from('session_folders')
        .update({
          script_status: newStatus,
          last_script_run: newStatus === 'running' ? new Date().toISOString() : session.last_script_run
        })
        .eq('id', session.id)
        .eq('user_id', userId);

      if (error) throw error;

      telegram.impact('light');
      loadSessions();
    } catch (error: any) {
      console.error('Error toggling script:', error);
      telegram.showAlert(error.message || 'Failed to toggle script');
    }
  };

  const openFolder = async (folderPath: string) => {
    telegram.showAlert(`Open folder: ${folderPath}\n\nThis would launch your file explorer in a desktop app.`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#4ade80';
      case 'active': return '#3b82f6';
      case 'error': return '#ef4444';
      case 'stopped': return '#f59e0b';
      default: return theme.hint_color;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center" style={{ color: theme.hint_color }}>
          Loading sessions...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg_color }}>
      <div
        className="sticky top-0 z-10 px-4 py-3 border-b flex items-center justify-between"
        style={{
          backgroundColor: theme.bg_color,
          borderBottomColor: theme.secondary_bg_color
        }}
      >
        <button
          onClick={onBack}
          className="p-2 -ml-2"
          style={{ color: theme.button_color }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-xl font-semibold" style={{ color: theme.text_color }}>
          Session Manager
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="p-2 -mr-2"
          style={{ color: theme.button_color }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-3">
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4" style={{ color: theme.hint_color }}>
              <svg className="mx-auto" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <p className="text-lg mb-2" style={{ color: theme.text_color }}>
              No session folders yet
            </p>
            <p className="text-sm mb-4" style={{ color: theme.hint_color }}>
              Create your first session folder to get started
            </p>
            <Button onClick={() => setShowCreateModal(true)} variant="primary">
              Create Session Folder
            </Button>
          </div>
        ) : (
          sessions.map(session => (
            <Card key={session.id} onClick={() => setSelectedSession(session)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold" style={{ color: theme.text_color }}>
                      {session.display_name}
                    </h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: getStatusColor(session.script_status) + '20',
                        color: getStatusColor(session.script_status)
                      }}
                    >
                      {session.script_status}
                    </span>
                  </div>
                  <p className="text-sm mb-1" style={{ color: theme.hint_color }}>
                    User ID: {session.telegram_user_id}
                  </p>
                  <p className="text-xs truncate" style={{ color: theme.hint_color }}>
                    {session.folder_path}
                  </p>
                  {session.error_message && (
                    <p className="text-xs mt-2" style={{ color: '#ef4444' }}>
                      {session.error_message}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleScript(session);
                    }}
                    className="p-2"
                    style={{ color: theme.button_color }}
                  >
                    {session.script_status === 'running' ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openFolder(session.folder_path);
                    }}
                    className="p-2"
                    style={{ color: theme.button_color }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl p-6"
            style={{ backgroundColor: theme.bg_color }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4" style={{ color: theme.text_color }}>
              Create Session Folder
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: theme.hint_color }}>
                  Telegram User ID *
                </label>
                <input
                  type="text"
                  value={newSession.telegram_user_id}
                  onChange={(e) => setNewSession({ ...newSession, telegram_user_id: e.target.value })}
                  placeholder="989906046260"
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: theme.secondary_bg_color,
                    color: theme.text_color,
                    borderColor: theme.secondary_bg_color
                  }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: theme.hint_color }}>
                  Display Name *
                </label>
                <input
                  type="text"
                  value={newSession.display_name}
                  onChange={(e) => setNewSession({ ...newSession, display_name: e.target.value })}
                  placeholder="Main Account"
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: theme.secondary_bg_color,
                    color: theme.text_color,
                    borderColor: theme.secondary_bg_color
                  }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: theme.hint_color }}>
                  Folder Path (optional)
                </label>
                <input
                  type="text"
                  value={newSession.folder_path}
                  onChange={(e) => setNewSession({ ...newSession, folder_path: e.target.value })}
                  placeholder="sessions/989906046260"
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: theme.secondary_bg_color,
                    color: theme.text_color,
                    borderColor: theme.secondary_bg_color
                  }}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => setShowCreateModal(false)} variant="secondary" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={createSession} variant="primary" className="flex-1">
                  Create
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSession && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: theme.bg_color }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-1" style={{ color: theme.text_color }}>
                  {selectedSession.display_name}
                </h2>
                <p className="text-sm" style={{ color: theme.hint_color }}>
                  {selectedSession.telegram_user_id}
                </p>
              </div>
              <button
                onClick={() => deleteSession(selectedSession.id)}
                className="p-2"
                style={{ color: '#ef4444' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>

            {stats && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: theme.secondary_bg_color }}>
                  <div className="text-2xl font-bold" style={{ color: theme.text_color }}>
                    {stats.messages_sent}
                  </div>
                  <div className="text-xs" style={{ color: theme.hint_color }}>Sent</div>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: theme.secondary_bg_color }}>
                  <div className="text-2xl font-bold" style={{ color: theme.text_color }}>
                    {stats.messages_failed}
                  </div>
                  <div className="text-xs" style={{ color: theme.hint_color }}>Failed</div>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: theme.secondary_bg_color }}>
                  <div className="text-2xl font-bold" style={{ color: theme.text_color }}>
                    {stats.groups_targeted}
                  </div>
                  <div className="text-xs" style={{ color: theme.hint_color }}>Groups</div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2" style={{ color: theme.text_color }}>
                Recent Logs
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: theme.hint_color }}>
                    No logs yet
                  </p>
                ) : (
                  logs.map(log => (
                    <div
                      key={log.id}
                      className="p-2 rounded text-xs"
                      style={{ backgroundColor: theme.secondary_bg_color }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: getStatusColor(log.log_level) + '20',
                            color: getStatusColor(log.log_level)
                          }}
                        >
                          {log.log_level.toUpperCase()}
                        </span>
                        <span style={{ color: theme.hint_color }}>
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ color: theme.text_color }}>{log.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Button
              onClick={() => setSelectedSession(null)}
              variant="secondary"
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}