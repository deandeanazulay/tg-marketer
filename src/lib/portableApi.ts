export const API_BASE = import.meta.env.VITE_PORTABLE_API_URL ?? 'http://localhost:3001';

export type Account = { 
  id: number; 
  phone: string; 
  label?: string; 
  status: 'pending' | 'active' | 'locked'; 
  hourly_sent?: number; 
  daily_sent?: number; 
  last_seen?: string;
  created_at?: string;
};

async function request<T>(path: string, opts: { method?: string; body?: any; token?: string } = {}): Promise<T> {
  try {
    const { method = 'GET', body, token } = opts;
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    
    return res.json() as Promise<T>;
  } catch (error) {
    // Fallback to mock mode if API is unavailable
    console.warn(`API request failed for ${path}, falling back to mock mode:`, error);
    return mockResponse(path, opts) as Promise<T>;
  }
}

function mockResponse(path: string, opts: any): any {
  // Mock responses for when API is unavailable
  if (path === '/auth/verify') {
    return { ok: true, jwt: 'mock-jwt-token' };
  }
  
  if (path === '/auth/bootstrap') {
    return {
      adapters: { data: 'mock' },
      features: { telegram: true, campaigns: true },
      ui: { theme: 'telegram' },
      defaults: { mode: 'demo' }
    };
  }
  
  if (path === '/accounts') {
    return [
      {
        id: 1,
        phone: '+1234567890',
        label: 'Demo Account',
        status: 'active',
        hourly_sent: 5,
        daily_sent: 25,
        last_seen: new Date().toISOString()
      }
    ];
  }
  
  if (path.startsWith('/jobs/')) {
    return {
      id: 1,
      type: 'send',
      status: 'done',
      created_at: new Date().toISOString()
    };
  }
  
  if (path === '/jobs/enqueue') {
    return {
      id: Math.floor(Math.random() * 1000),
      type: opts.body?.type || 'send',
      status: 'queued',
      created_at: new Date().toISOString()
    };
  }
  
  return { ok: true };
}

export const portableApi = {
  request,
  
  // Auth endpoints
  verifyInit: (initData: string) => 
    request<{ ok: boolean; jwt?: string }>('/auth/verify', { 
      method: 'POST', 
      body: { initData } 
    }),
  
  getBootstrap: (jwt: string) => 
    request('/auth/bootstrap', { token: jwt }),
  
  saveUserMode: (jwt: string, mode: 'demo' | 'real') => 
    request('/auth/user-mode', { 
      method: 'POST', 
      token: jwt, 
      body: { mode } 
    }),

  // Account management
  accounts: {
    list: (jwt: string) => 
      request<Account[]>('/accounts', { token: jwt }),
    
    startLogin: (jwt: string, phone: string) => 
      request<{ phoneCodeHash: string }>('/accounts/start', { 
        method: 'POST', 
        token: jwt, 
        body: { phone } 
      }),
    
    verifyCode: (jwt: string, phone: string, code: string, phoneCodeHash: string) =>
      request('/accounts/code', { 
        method: 'POST', 
        token: jwt, 
        body: { phone, code, phoneCodeHash } 
      }),
    
    remove: (jwt: string, account_id: number) =>
      request('/accounts/remove', { 
        method: 'POST', 
        token: jwt, 
        body: { account_id } 
      }),
  },
  
  // Job management
  jobs: {
    enqueue: (jwt: string, job: { type: string; account_id: number; payload: any }) =>
      request<{ id: number }>('/jobs/enqueue', { 
        method: 'POST', 
        token: jwt, 
        body: job 
      }),
    
    get: (jwt: string, id: number) => 
      request<{ id: number; status: string; type: string; created_at: string }>(`/jobs/${id}`, { token: jwt }),
  },

  // Mock provider for when API is unavailable or JWT is null
  mock() {
    return {
      accounts: async () => ([
        { 
          id: 1, 
          phone: '+1234567890', 
          label: 'Demo Account A', 
          status: 'active', 
          hourly_sent: 5, 
          daily_sent: 20, 
          last_seen: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
        },
        { 
          id: 2, 
          phone: '+0987654321', 
          label: 'Demo Account B', 
          status: 'pending', 
          hourly_sent: 0, 
          daily_sent: 0, 
          last_seen: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        },
      ]),
      send: async (_: { chatId: string; text: string }) => true,
    };
  },
};