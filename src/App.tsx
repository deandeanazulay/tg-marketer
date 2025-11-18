import { useEffect, useState } from 'react';

interface SystemStatus {
  status: string;
  version: string;
  database: string;
  workers: number;
}

function App() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setStatus(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch status:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-2xl w-full p-8">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">TG Marketer</h1>
            <p className="text-gray-400">Backend API & Worker System</p>
            <div className="mt-4 inline-block px-4 py-2 bg-blue-600 rounded-full text-sm font-medium">
              v2.0.0 - API Only
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading system status...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border-t border-gray-700 pt-6">
                <h2 className="text-xl font-semibold mb-4">System Status</h2>

                {status ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                      <span className="text-gray-300">Status</span>
                      <span className="font-medium text-green-400">{status.status}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                      <span className="text-gray-300">Version</span>
                      <span className="font-medium">{status.version}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                      <span className="text-gray-300">Database</span>
                      <span className="font-medium">{status.database}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                      <span className="text-gray-300">Active Workers</span>
                      <span className="font-medium">{status.workers || 0}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-red-400 p-4 bg-red-900/20 rounded">
                    Failed to load system status
                  </div>
                )}
              </div>

              <div className="border-t border-gray-700 pt-6">
                <h2 className="text-xl font-semibold mb-4">API Documentation</h2>
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-gray-700 rounded">
                    <code className="text-blue-300">POST /api/auth?action=login</code>
                    <p className="text-gray-400 mt-1">Authenticate with email/password</p>
                  </div>
                  <div className="p-3 bg-gray-700 rounded">
                    <code className="text-blue-300">POST /api/auth?action=register</code>
                    <p className="text-gray-400 mt-1">Create new user account</p>
                  </div>
                  <div className="p-3 bg-gray-700 rounded">
                    <code className="text-blue-300">GET /api/accounts</code>
                    <p className="text-gray-400 mt-1">List Telegram sending accounts</p>
                  </div>
                  <div className="p-3 bg-gray-700 rounded">
                    <code className="text-blue-300">GET /api/worker?action=stats</code>
                    <p className="text-gray-400 mt-1">Worker system statistics</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
                <div className="grid grid-cols-2 gap-4">
                  <a
                    href="/api/health"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 bg-gray-700 hover:bg-gray-600 rounded text-center transition"
                  >
                    Health Check
                  </a>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 bg-gray-700 hover:bg-gray-600 rounded text-center transition"
                  >
                    Worker Docs
                  </a>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 pt-4">
                <p>TG Marketer is now a backend-only system.</p>
                <p className="mt-1">Use the API endpoints to integrate with your applications.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
