import { type DataStore, type BootstrapConfig } from '../../data/types';
import { MockStore } from '../data/mock';

class ApiService {
  private dataStore: DataStore | null = null;
  private baseUrl: string;
  private token: string | null = null;
  private ownerId: string | null = null;
  private mode: 'demo' | 'real' = 'demo';

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '/api';
    this.token = localStorage.getItem('telegram_jwt');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('telegram_jwt', token);
  }

  setOwnerId(id: string) {
    this.ownerId = id;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('telegram_jwt');
  }

  async initializeDataStore(cfg: BootstrapConfig, mode: 'demo' | 'real') {
    if (!this.ownerId) throw new Error("Owner ID not set for data store initialization.");
    this.mode = mode;
    
    if (mode === 'demo') {
      // Use local MockStore for demo mode
      this.dataStore = new MockStore(this.ownerId);
    } else {
      // Use API calls for real mode
      this.dataStore = this as any; // Self-reference for interface compatibility
    }
  }

  getMode(): 'demo' | 'real' {
    return this.mode;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async verifyInit(initData: string) {
    if (this.mode === 'demo') {
      return { success: true, user: { id: 1, first_name: 'Demo', username: 'demo_user' }, jwt: 'demo_token', telegram_id: '1' };
    }

    const result = await this.request('/verify-init', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    });
    
    if (result.token) {
      this.setOwnerId(result.telegram_id);
      this.setToken(result.token);
    }
    
    return result;
  }

  // Templates
  async getTemplates(ownerId: string) {
    if (this.mode === 'demo') {
      return this.dataStore!.getTemplates(ownerId);
    }
    return this.request('/templates');
  }

  async createTemplate(template: { name: string; content: string; variables: Record<string, any> }, ownerId: string) {
    if (this.mode === 'demo') {
      return this.dataStore!.createTemplate({ ...template, owner_id: ownerId });
    }
    return this.request('/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }
  
  async deleteTemplate(id: string, ownerId: string) {
    if (this.mode === 'demo') {
      return this.dataStore!.deleteTemplate(id, ownerId);
    }
    return this.request(`/templates/${id}`, { method: 'DELETE' });
  }

  // Destinations
  async getDestinations(ownerId: string) {
    if (this.mode === 'demo') {
      return this.dataStore!.getDestinations(ownerId);
    }
    return this.request('/destinations');
  }

  async createDestination(destination: { chat_id: string; title: string; type: string; can_send: boolean }, ownerId: string) {
    if (this.mode === 'demo') {
      return this.dataStore!.createDestination({ ...destination, owner_id: ownerId, created_at: new Date() });
    }
    return this.request('/destinations', {
      method: 'POST',
      body: JSON.stringify(destination),
    });
  }
  
  // Campaigns
  async getCampaigns(ownerId: string) {
    if (this.mode === 'demo') {
      return this.dataStore!.getCampaigns(ownerId);
    }
    return this.request('/campaigns');
  }

  async createCampaign(campaign: { template_id: string; status: string }, ownerId: string) {
    if (this.mode === 'demo') {
      return this.dataStore!.createCampaign({ ...campaign, owner_id: ownerId });
    }
    return this.request('/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaign),
    });
  }

  async getCampaignStats(campaignId: string, ownerId: string) {
    if (this.mode === 'demo') {
      return this.dataStore!.getCampaignStats(campaignId);
    }
    return this.request(`/campaigns/${campaignId}/stats`);
  }
}

export const api = new ApiService();