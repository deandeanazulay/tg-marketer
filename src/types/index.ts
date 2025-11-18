// Shared types for TG Marketer frontend
// These mirror the server-side types but are safe for browser bundling

export interface Profile {
  telegram_id: string;
  username?: string;
  role: 'user' | 'admin';
  created_at: Date;
}

export interface Template {
  id: string;
  owner_id: string;
  name: string;
  content: string;
  variables: Record<string, any>;
  created_at: Date;
}

export interface Destination {
  id: string;
  owner_id: string;
  chat_id: string;
  title: string;
  type: 'channel' | 'group' | 'private';
  can_send: boolean;
  created_at: Date;
}

export interface Campaign {
  id: string;
  owner_id: string;
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
  getProfile(telegramId: string): Promise<Profile | null>;
  createProfile(profile: Omit<Profile, 'created_at'>): Promise<Profile>;

  getTemplates(ownerId: string): Promise<Template[]>;
  getTemplate(id: string, ownerId: string): Promise<Template | null>;
  createTemplate(template: Omit<Template, 'id' | 'created_at'>): Promise<Template>;
  updateTemplate(id: string, ownerId: string, updates: Partial<Template>): Promise<void>;
  deleteTemplate(id: string, ownerId: string): Promise<void>;

  getDestinations(ownerId: string): Promise<Destination[]>;
  getDestination(id: string, ownerId: string): Promise<Destination | null>;
  createDestination(destination: Omit<Destination, 'id' | 'created_at'>): Promise<Destination>;
  deleteDestination(id: string, ownerId: string): Promise<void>;

  getCampaigns(ownerId: string): Promise<Campaign[]>;
  getCampaign(id: string, ownerId: string): Promise<Campaign | null>;
  createCampaign(campaign: Omit<Campaign, 'id' | 'created_at'>): Promise<Campaign>;
  updateCampaignStatus(id: string, ownerId: string, status: Campaign['status'], completedAt?: Date): Promise<void>;

  getCampaignItems(campaignId: string): Promise<CampaignItem[]>;
  createCampaignItems(items: Omit<CampaignItem, 'id'>[]): Promise<void>;
  updateCampaignItem(id: string, status: CampaignItem['status'], error?: string, sentAt?: Date): Promise<void>;
  getCampaignStats(campaignId: string): Promise<CampaignStats>;

  getAppConfig(app: string): Promise<AppConfig | null>;
  setAppConfig(app: string, config: AppConfig['config']): Promise<void>;

  getUserPreference(telegramId: string, app: string): Promise<UserPreference | null>;
  setUserPreference(telegramId: string, app: string, mode: 'demo' | 'real'): Promise<void>;
}

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

export interface SessionFolder {
  id: string;
  user_id: string;
  telegram_user_id: string;
  folder_path: string;
  display_name: string;
  status: 'active' | 'inactive' | 'running' | 'error';
  telegram_exe_present: boolean;
  session_file_present: boolean;
  last_script_run?: Date;
  script_status: 'idle' | 'running' | 'stopped' | 'error';
  script_config: {
    delay_min_sec: number;
    delay_max_sec: number;
    group_delay_sec: number;
    max_messages_per_cycle: number;
  };
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SessionScriptLog {
  id: string;
  session_id: string;
  log_level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details: Record<string, any>;
  created_at: Date;
}

export interface SessionScriptStats {
  id: string;
  session_id: string;
  messages_sent: number;
  messages_failed: number;
  groups_targeted: number;
  last_reset: Date;
  created_at: Date;
  updated_at: Date;
}
