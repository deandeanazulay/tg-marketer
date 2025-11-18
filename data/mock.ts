import {
  DataStore,
  Profile,
  Template,
  Destination,
  Campaign,
  CampaignItem,
  CampaignStats,
  AppConfig,
  UserPreference
} from './types';

// Mock implementation for development
export class MockStore implements DataStore {
  private profiles: Profile[] = [];
  private templates: Template[] = [
    {
      id: '1',
      owner_id: '1',
      name: 'Welcome Message',
      content: 'Hello {{name}}! Welcome to our {{channel_name}}. We\'re excited to have you here! 🎉',
      variables: { name: 'User', channel_name: 'Channel' },
      created_at: new Date('2024-01-15')
    },
    {
      id: '2',
      owner_id: '1',
      name: 'Product Launch',
      content: '🚀 Big news! We\'re launching {{product_name}} on {{launch_date}}. Get {{discount}}% off with code {{promo_code}}!',
      variables: { product_name: 'New Product', launch_date: 'Tomorrow', discount: '20', promo_code: 'LAUNCH20' },
      created_at: new Date('2024-01-16')
    },
    {
      id: '3',
      owner_id: '1',
      name: 'Event Reminder',
      content: '📅 Don\'t forget! {{event_name}} is happening {{when}}. Location: {{location}}. See you there!',
      variables: { event_name: 'Demo Event', when: 'this Friday at 7 PM', location: 'Online' },
      created_at: new Date('2024-01-17')
    }
  ];
  private destinations: Destination[] = [
    {
      id: '1',
      owner_id: '1',
      chat_id: '-1001234567890',
      title: 'Demo Marketing Channel',
      type: 'channel',
      can_send: true,
      created_at: new Date('2024-01-10')
    },
    {
      id: '2',
      owner_id: '1',
      chat_id: '-1001234567891',
      title: 'Product Updates Group',
      type: 'group',
      can_send: true,
      created_at: new Date('2024-01-11')
    },
    {
      id: '3',
      owner_id: '1',
      chat_id: '-1001234567892',
      title: 'Community Chat',
      type: 'group',
      can_send: false,
      created_at: new Date('2024-01-12')
    },
    {
      id: '4',
      owner_id: '1',
      chat_id: '-1001234567893',
      title: 'Announcements Channel',
      type: 'channel',
      can_send: true,
      created_at: new Date('2024-01-13')
    }
  ];
  private campaigns: Campaign[] = [];
  private campaignItems: CampaignItem[] = [];
  private appConfigs: AppConfig[] = [{
    app: 'miniapp',
    config: {
      adapters: { data: 'mock' },
      features: { someFeature: true },
      ui: { brand: 'TG Marketer', accent: '#0088cc' },
      defaults: { mode: 'demo' }
    },
    updated_at: new Date()
  }];
  private userPreferences: UserPreference[] = [];

  async getProfile(telegramId: string): Promise<Profile | null> {
    return this.profiles.find(p => p.telegram_id === telegramId) || null;
  }

  async createProfile(profile: Omit<Profile, 'created_at'>): Promise<Profile> {
    const newProfile = { ...profile, created_at: new Date() };
    this.profiles.push(newProfile);
    return newProfile;
  }

  async getTemplates(ownerId: string): Promise<Template[]> {
    return this.templates.filter(t => t.owner_id === ownerId);
  }

  async getTemplate(id: string, ownerId: string): Promise<Template | null> {
    return this.templates.find(t => t.id === id && t.owner_id === ownerId) || null;
  }

  async createTemplate(template: Omit<Template, 'id' | 'created_at'>): Promise<Template> {
    const newTemplate = {
      ...template,
      id: Date.now().toString(),
      created_at: new Date()
    };
    this.templates.push(newTemplate);
    return newTemplate;
  }

  async updateTemplate(id: string, ownerId: string, updates: Partial<Template>): Promise<void> {
    const index = this.templates.findIndex(t => t.id === id && t.owner_id === ownerId);
    if (index >= 0) {
      this.templates[index] = { ...this.templates[index], ...updates };
    }
  }

  async deleteTemplate(id: string, ownerId: string): Promise<void> {
    this.templates = this.templates.filter(t => !(t.id === id && t.owner_id === ownerId));
  }

  async getDestinations(ownerId: string): Promise<Destination[]> {
    return this.destinations.filter(d => d.owner_id === ownerId);
  }

  async getDestination(id: string, ownerId: string): Promise<Destination | null> {
    return this.destinations.find(d => d.id === id && d.owner_id === ownerId) || null;
  }

  async createDestination(destination: Omit<Destination, 'id' | 'created_at'>): Promise<Destination> {
    const newDestination = {
      ...destination,
      id: Date.now().toString(),
      created_at: new Date()
    };
    this.destinations.push(newDestination);
    return newDestination;
  }

  async deleteDestination(id: string, ownerId: string): Promise<void> {
    this.destinations = this.destinations.filter(d => !(d.id === id && d.owner_id === ownerId));
  }

  async getCampaigns(ownerId: string): Promise<Campaign[]> {
    return this.campaigns.filter(c => c.owner_id === ownerId);
  }

  async getCampaign(id: string, ownerId: string): Promise<Campaign | null> {
    return this.campaigns.find(c => c.id === id && c.owner_id === ownerId) || null;
  }

  async createCampaign(campaign: Omit<Campaign, 'id' | 'created_at'>): Promise<Campaign> {
    const newCampaign = {
      ...campaign,
      id: Date.now().toString(),
      created_at: new Date()
    };
    this.campaigns.push(newCampaign);
    return newCampaign;
  }

  async updateCampaignStatus(id: string, ownerId: string, status: Campaign['status'], completedAt?: Date): Promise<void> {
    const index = this.campaigns.findIndex(c => c.id === id && c.owner_id === ownerId);
    if (index >= 0) {
      this.campaigns[index] = { 
        ...this.campaigns[index], 
        status,
        ...(completedAt && { completed_at: completedAt })
      };
    }
  }

  async getCampaignItems(campaignId: string): Promise<CampaignItem[]> {
    return this.campaignItems.filter(i => i.campaign_id === campaignId);
  }

  async createCampaignItems(items: Omit<CampaignItem, 'id'>[]): Promise<void> {
    const newItems = items.map(item => ({
      ...item,
      id: Date.now().toString() + Math.random()
    }));
    this.campaignItems.push(...newItems);
  }

  async updateCampaignItem(id: string, status: CampaignItem['status'], error?: string, sentAt?: Date): Promise<void> {
    const index = this.campaignItems.findIndex(i => i.id === id);
    if (index >= 0) {
      this.campaignItems[index] = {
        ...this.campaignItems[index],
        status,
        ...(error && { last_error: error }),
        ...(sentAt && { sent_at: sentAt })
      };
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

  async getAppConfig(app: string): Promise<AppConfig | null> {
    return this.appConfigs.find(c => c.app === app) || null;
  }

  async setAppConfig(app: string, config: AppConfig['config']): Promise<void> {
    const index = this.appConfigs.findIndex(c => c.app === app);
    if (index >= 0) {
      this.appConfigs[index] = { ...this.appConfigs[index], config, updated_at: new Date() };
    } else {
      this.appConfigs.push({ app, config, updated_at: new Date() });
    }
  }

  async getUserPreference(telegramId: string, app: string): Promise<UserPreference | null> {
    return this.userPreferences.find(p => p.telegram_id === telegramId && p.app === app) || null;
  }

  async setUserPreference(telegramId: string, app: string, mode: 'demo' | 'real'): Promise<void> {
    const index = this.userPreferences.findIndex(p => p.telegram_id === telegramId && p.app === app);
    if (index >= 0) {
      this.userPreferences[index] = { ...this.userPreferences[index], mode, updated_at: new Date() };
    } else {
      this.userPreferences.push({ telegram_id: telegramId, app, mode, updated_at: new Date() });
    }
  }
}