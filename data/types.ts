import { Column, Table } from "drizzle-orm";

// DataStore Interface
export interface Profile {
  telegram_id: string; // Changed to string to match JWT payload
  username?: string;
  role: 'user' | 'admin';
  created_at: Date;
}

export interface Template {
  id: string;
  owner_id: string; // Changed to string
  name: string;
  content: string;
  variables: Record<string, any>;
  created_at: Date;
}

export interface Destination {
  id: string;
  owner_id: string; // Changed to string
  chat_id: string;
  title: string;
  type: 'channel' | 'group' | 'private';
  can_send: boolean;
  created_at: Date;
}

export interface Campaign {
  id: string;
  owner_id: string; // Changed to string
  template_id: string;
  status: 'draft' | 'running' | 'done' | 'failed';
  created_at: Date;
  completed_at?: Date;
}

export interface CampaignItem {
  id: string;
  campaign_id: string;
  destination_id: string;
  status: 'pending' | 'sent' | 'failed';
  last_error?: string;
  sent_at?: Date;
}

export interface CampaignStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export interface UserPreference {
  telegram_id: string;
  app: string;
  mode: 'demo' | 'real';
  updated_at: Date;
}

export interface AppConfig {
  app: string;
  config: {
    adapters: {
      data: "postgres" | "sqlite" | "mock";
    };
    features: Record<string, boolean>;
    ui: {
      brand: string;
      accent: string;
    };
    defaults: {
      mode: "demo" | "real";
    };
  };
  updated_at: Date;
}

export interface DataStore {
  // Profiles
  getProfile(telegramId: string): Promise<Profile | null>;
  createProfile(profile: Omit<Profile, 'created_at'>): Promise<Profile>;
  
  // Templates
  getTemplates(ownerId: string): Promise<Template[]>;
  getTemplate(id: string, ownerId: string): Promise<Template | null>;
  createTemplate(template: Omit<Template, 'id' | 'created_at'>): Promise<Template>;
  updateTemplate(id: string, ownerId: string, updates: Partial<Template>): Promise<void>;
  deleteTemplate(id: string, ownerId: string): Promise<void>;
  
  // Destinations
  getDestinations(ownerId: string): Promise<Destination[]>;
  getDestination(id: string, ownerId: string): Promise<Destination | null>;
  createDestination(destination: Omit<Destination, 'id' | 'created_at'>): Promise<Destination>;
  deleteDestination(id: string, ownerId: string): Promise<void>;
  
  // Campaigns
  getCampaigns(ownerId: string): Promise<Campaign[]>;
  getCampaign(id: string, ownerId: string): Promise<Campaign | null>;
  createCampaign(campaign: Omit<Campaign, 'id' | 'created_at'>): Promise<Campaign>;
  updateCampaignStatus(id: string, ownerId: string, status: Campaign['status'], completedAt?: Date): Promise<void>;
  
  // Campaign Items
  getCampaignItems(campaignId: string): Promise<CampaignItem[]>;
  createCampaignItems(items: Omit<CampaignItem, 'id'>[]): Promise<void>;
  updateCampaignItem(id: string, status: CampaignItem['status'], error?: string, sentAt?: Date): Promise<void>;
  getCampaignStats(campaignId: string): Promise<CampaignStats>;

  // App Config
  getAppConfig(app: string): Promise<AppConfig | null>;
  setAppConfig(app: string, config: AppConfig['config']): Promise<void>;

  // User Preferences
  getUserPreference(telegramId: string, app: string): Promise<UserPreference | null>;
  setUserPreference(telegramId: string, app: string, mode: 'demo' | 'real'): Promise<void>;
}

// Bootstrap Configuration
export interface BootstrapConfig {
  adapters: {
    data: "postgres" | "sqlite" | "mock";
  };
  features: Record<string, boolean>;
  ui: {
    brand: string;
    accent: string;
  };
  defaults: {
    mode: "demo" | "real";
  };
}