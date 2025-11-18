export type Destination = { 
  id: string; 
  owner_id: string;
  chat_id: string;
  title: string; 
  type: "channel" | "group" | "private"; 
  username?: string; 
  can_send: boolean;
  created_at: Date;
};

export type Template = { 
  id: string; 
  owner_id: string;
  name: string; 
  content: string;
  variables: Record<string, any>;
  created_at: Date;
};

export type Campaign = { 
  id: string; 
  owner_id: string;
  template_id: string;
  status: "draft" | "running" | "done" | "failed";
  created_at: Date;
  completed_at?: Date;
};

export type CampaignItem = {
  id: string;
  campaign_id: string;
  destination_id: string;
  status: 'pending' | 'sent' | 'failed';
  last_error?: string;
  sent_at?: Date;
};

export type CampaignStats = {
  total: number;
  sent: number;
  failed: number;
  pending: number;
};

const LS_KEY = "tg_marketer_demo_v1";

type Dataset = { 
  destinations: Destination[]; 
  templates: Template[]; 
  campaigns: Campaign[];
  campaignItems: CampaignItem[];
};

function load(): Dataset | null {
  try { 
    return JSON.parse(localStorage.getItem(LS_KEY) || "null"); 
  } catch { 
    return null; 
  }
}

function save(ds: Dataset) { 
  localStorage.setItem(LS_KEY, JSON.stringify(ds)); 
}

function defaultDataset(ownerId: string): Dataset {
  const now = new Date();
  return {
    destinations: [
      { 
        id: "d1", 
        owner_id: ownerId,
        chat_id: "-1001234567890",
        type: "channel", 
        title: "Demo Marketing Channel", 
        username: "demo_marketing", 
        can_send: true,
        created_at: now
      },
      { 
        id: "d2", 
        owner_id: ownerId,
        chat_id: "-1001234567891",
        type: "group", 
        title: "Product Updates Group", 
        username: "product_updates", 
        can_send: true,
        created_at: now
      },
      { 
        id: "d3", 
        owner_id: ownerId,
        chat_id: "-1001234567892",
        type: "channel", 
        title: "Announcements Channel", 
        username: "announcements", 
        can_send: true,
        created_at: now
      },
      { 
        id: "d4", 
        owner_id: ownerId,
        chat_id: "-1001234567893",
        type: "group", 
        title: "Community Chat", 
        username: "community", 
        can_send: false,
        created_at: now
      },
    ],
    templates: [
      { 
        id: "t1", 
        owner_id: ownerId,
        name: "Welcome Message", 
        content: "Hello {{name}}! Welcome to our {{channel_name}}. We're excited to have you here! 🎉",
        variables: { name: 'User', channel_name: 'Channel' },
        created_at: now
      },
      { 
        id: "t2", 
        owner_id: ownerId,
        name: "Product Launch", 
        content: "🚀 Big news! We're launching {{product_name}} on {{launch_date}}. Get {{discount}}% off with code {{promo_code}}!",
        variables: { product_name: 'New Product', launch_date: 'Tomorrow', discount: '20', promo_code: 'LAUNCH20' },
        created_at: now
      },
      { 
        id: "t3", 
        owner_id: ownerId,
        name: "Event Reminder", 
        content: "📅 Don't forget! {{event_name}} is happening {{when}}. Location: {{location}}. See you there!",
        variables: { event_name: 'Demo Event', when: 'this Friday at 7 PM', location: 'Online' },
        created_at: now
      },
    ],
    campaigns: [
      { 
        id: "c1", 
        owner_id: ownerId,
        template_id: "t1",
        status: "done",
        created_at: new Date(now.getTime() - 86400000), // 1 day ago
        completed_at: new Date(now.getTime() - 3600000) // 1 hour ago
      },
      { 
        id: "c2", 
        owner_id: ownerId,
        template_id: "t2",
        status: "draft",
        created_at: now
      },
    ],
    campaignItems: [
      {
        id: "ci1",
        campaign_id: "c1",
        destination_id: "d1",
        status: "sent",
        sent_at: new Date(now.getTime() - 3600000)
      },
      {
        id: "ci2", 
        campaign_id: "c1",
        destination_id: "d2",
        status: "sent",
        sent_at: new Date(now.getTime() - 3600000)
      }
    ]
  };
}

function ensureSeed(ownerId: string): Dataset {
  const current = load();
  if (current && current.destinations?.length && current.templates?.length) {
    return current;
  }
  const seeded = defaultDataset(ownerId);
  save(seeded);
  return seeded;
}

export class MockStore {
  private ds: Dataset;
  private ownerId: string;

  constructor(ownerId: string = "demo_user") { 
    this.ownerId = ownerId;
    this.ds = ensureSeed(ownerId); 
  }

  // Profiles
  async getProfile(telegramId: string) {
    return {
      telegram_id: telegramId,
      username: 'demo_user',
      role: 'user' as const,
      created_at: new Date()
    };
  }

  async createProfile(profile: any) {
    return { ...profile, created_at: new Date() };
  }

  // Templates
  async getTemplates(ownerId: string) { 
    return this.ds.templates.filter(t => t.owner_id === ownerId); 
  }

  async getTemplate(id: string, ownerId: string) {
    return this.ds.templates.find(t => t.id === id && t.owner_id === ownerId) || null;
  }

  async createTemplate(template: Omit<Template, 'id' | 'created_at'>) {
    const newTemplate = { 
      ...template, 
      id: "t" + Date.now(), 
      created_at: new Date() 
    };
    this.ds.templates.unshift(newTemplate); 
    save(this.ds); 
    return newTemplate;
  }

  async updateTemplate(id: string, ownerId: string, updates: Partial<Template>) {
    const index = this.ds.templates.findIndex(t => t.id === id && t.owner_id === ownerId);
    if (index >= 0) {
      this.ds.templates[index] = { ...this.ds.templates[index], ...updates };
      save(this.ds);
    }
  }

  async deleteTemplate(id: string, ownerId: string) {
    this.ds.templates = this.ds.templates.filter(t => !(t.id === id && t.owner_id === ownerId));
    save(this.ds);
  }

  // Destinations
  async getDestinations(ownerId: string) { 
    return this.ds.destinations.filter(d => d.owner_id === ownerId); 
  }

  async getDestination(id: string, ownerId: string) {
    return this.ds.destinations.find(d => d.id === id && d.owner_id === ownerId) || null;
  }

  async createDestination(destination: Omit<Destination, 'id' | 'created_at'>) {
    const newDestination = { 
      ...destination, 
      id: "d" + Date.now(), 
      created_at: new Date() 
    };
    this.ds.destinations.unshift(newDestination); 
    save(this.ds); 
    return newDestination;
  }

  async deleteDestination(id: string, ownerId: string) {
    this.ds.destinations = this.ds.destinations.filter(d => !(d.id === id && d.owner_id === ownerId));
    save(this.ds);
  }

  // Campaigns
  async getCampaigns(ownerId: string) { 
    return this.ds.campaigns.filter(c => c.owner_id === ownerId); 
  }

  async getCampaign(id: string, ownerId: string) {
    return this.ds.campaigns.find(c => c.id === id && c.owner_id === ownerId) || null;
  }

  async createCampaign(campaign: Omit<Campaign, 'id' | 'created_at'>) {
    const newCampaign = { 
      ...campaign, 
      id: "c" + Date.now(), 
      created_at: new Date() 
    };
    this.ds.campaigns.unshift(newCampaign); 
    save(this.ds); 
    return newCampaign;
  }

  async updateCampaignStatus(id: string, ownerId: string, status: Campaign['status'], completedAt?: Date) {
    const index = this.ds.campaigns.findIndex(c => c.id === id && c.owner_id === ownerId);
    if (index >= 0) {
      this.ds.campaigns[index] = { 
        ...this.ds.campaigns[index], 
        status,
        ...(completedAt && { completed_at: completedAt })
      };
      save(this.ds);
    }
  }

  // Campaign Items
  async getCampaignItems(campaignId: string) {
    return this.ds.campaignItems.filter(i => i.campaign_id === campaignId);
  }

  async createCampaignItems(items: Omit<CampaignItem, 'id'>[]) {
    const newItems = items.map(item => ({
      ...item,
      id: "ci" + Date.now() + Math.random()
    }));
    this.ds.campaignItems.push(...newItems);
    save(this.ds);
  }

  async updateCampaignItem(id: string, status: CampaignItem['status'], error?: string, sentAt?: Date) {
    const index = this.ds.campaignItems.findIndex(i => i.id === id);
    if (index >= 0) {
      this.ds.campaignItems[index] = {
        ...this.ds.campaignItems[index],
        status,
        ...(error && { last_error: error }),
        ...(sentAt && { sent_at: sentAt })
      };
      save(this.ds);
    }
  }

  async getCampaignStats(campaignId: string): Promise<CampaignStats> {
    const items = await this.getCampaignItems(campaignId);
    return {
      total: items.length,
      sent: items.filter(i => i.status === 'sent').length,
      failed: items.filter(i => i.status === 'failed').length,
      pending: items.filter(i => i.status === 'pending').length
    };
  }

  // App Config & User Preferences (mock implementations)
  async getAppConfig(app: string) {
    return {
      app,
      config: {
        adapters: { data: 'mock' },
        features: { someFeature: true },
        ui: { brand: 'TG Marketer', accent: '#0088cc' },
        defaults: { mode: 'demo' }
      },
      updated_at: new Date()
    };
  }

  async setAppConfig(app: string, config: any) {
    // Mock implementation - no persistence needed
  }

  async getUserPreference(telegramId: string, app: string) {
    return null; // No saved preference in demo
  }

  async setUserPreference(telegramId: string, app: string, mode: 'demo' | 'real') {
    // Mock implementation - no persistence needed
  }

  // Utility method to reset demo data
  resetDemoData() {
    this.ds = defaultDataset(this.ownerId);
    save(this.ds);
  }
}

export function getMockDataStore(ownerId: string = 'demo-user') {
  return new MockStore(ownerId);
}