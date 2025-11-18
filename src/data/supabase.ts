import { SupabaseClient } from '@supabase/supabase-js';
import type {
  DataStore,
  Profile,
  Template,
  Destination,
  Campaign,
  CampaignItem,
  CampaignStats,
  AppConfig,
  UserPreference
} from '../types';

export class SupabaseDataStore implements DataStore {
  private client: SupabaseClient;
  private ownerId: string;

  constructor(client: SupabaseClient, ownerId: string) {
    this.client = client;
    this.ownerId = ownerId;
  }

  async getProfile(telegramId: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      telegram_id: data.telegram_id,
      username: data.username,
      role: data.role,
      created_at: new Date(data.created_at)
    };
  }

  async createProfile(profile: Omit<Profile, 'created_at'>): Promise<Profile> {
    const { data, error } = await this.client
      .from('profiles')
      .insert({
        telegram_id: profile.telegram_id,
        username: profile.username,
        role: profile.role
      })
      .select()
      .single();

    if (error) throw error;

    return {
      telegram_id: data.telegram_id,
      username: data.username,
      role: data.role,
      created_at: new Date(data.created_at)
    };
  }

  async getTemplates(ownerId: string): Promise<Template[]> {
    const { data, error } = await this.client
      .from('templates')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(t => ({
      id: t.id,
      owner_id: t.owner_id,
      name: t.name,
      content: t.content,
      variables: t.variables || {},
      created_at: new Date(t.created_at)
    }));
  }

  async getTemplate(id: string, ownerId: string): Promise<Template | null> {
    const { data, error } = await this.client
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      owner_id: data.owner_id,
      name: data.name,
      content: data.content,
      variables: data.variables || {},
      created_at: new Date(data.created_at)
    };
  }

  async createTemplate(template: Omit<Template, 'id' | 'created_at'>): Promise<Template> {
    const { data, error } = await this.client
      .from('templates')
      .insert({
        owner_id: template.owner_id,
        name: template.name,
        content: template.content,
        variables: template.variables
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      owner_id: data.owner_id,
      name: data.name,
      content: data.content,
      variables: data.variables || {},
      created_at: new Date(data.created_at)
    };
  }

  async updateTemplate(id: string, ownerId: string, updates: Partial<Template>): Promise<void> {
    const { error } = await this.client
      .from('templates')
      .update({
        name: updates.name,
        content: updates.content,
        variables: updates.variables
      })
      .eq('id', id)
      .eq('owner_id', ownerId);

    if (error) throw error;
  }

  async deleteTemplate(id: string, ownerId: string): Promise<void> {
    const { error } = await this.client
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('owner_id', ownerId);

    if (error) throw error;
  }

  async getDestinations(ownerId: string): Promise<Destination[]> {
    const { data, error } = await this.client
      .from('destinations')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(d => ({
      id: d.id,
      owner_id: d.owner_id,
      chat_id: d.chat_id,
      title: d.title,
      type: d.type,
      can_send: d.can_send,
      created_at: new Date(d.created_at)
    }));
  }

  async getDestination(id: string, ownerId: string): Promise<Destination | null> {
    const { data, error } = await this.client
      .from('destinations')
      .select('*')
      .eq('id', id)
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      owner_id: data.owner_id,
      chat_id: data.chat_id,
      title: data.title,
      type: data.type,
      can_send: data.can_send,
      created_at: new Date(data.created_at)
    };
  }

  async createDestination(destination: Omit<Destination, 'id' | 'created_at'>): Promise<Destination> {
    const { data, error } = await this.client
      .from('destinations')
      .insert({
        owner_id: destination.owner_id,
        chat_id: destination.chat_id,
        title: destination.title,
        type: destination.type,
        can_send: destination.can_send
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      owner_id: data.owner_id,
      chat_id: data.chat_id,
      title: data.title,
      type: data.type,
      can_send: data.can_send,
      created_at: new Date(data.created_at)
    };
  }

  async deleteDestination(id: string, ownerId: string): Promise<void> {
    const { error } = await this.client
      .from('destinations')
      .delete()
      .eq('id', id)
      .eq('owner_id', ownerId);

    if (error) throw error;
  }

  async getCampaigns(ownerId: string): Promise<Campaign[]> {
    const { data, error } = await this.client
      .from('campaigns')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(c => ({
      id: c.id,
      owner_id: c.owner_id,
      template_id: c.template_id,
      status: c.status,
      created_at: new Date(c.created_at),
      completed_at: c.completed_at ? new Date(c.completed_at) : undefined
    }));
  }

  async getCampaign(id: string, ownerId: string): Promise<Campaign | null> {
    const { data, error } = await this.client
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      owner_id: data.owner_id,
      template_id: data.template_id,
      status: data.status,
      created_at: new Date(data.created_at),
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined
    };
  }

  async createCampaign(campaign: Omit<Campaign, 'id' | 'created_at'>): Promise<Campaign> {
    const { data, error } = await this.client
      .from('campaigns')
      .insert({
        owner_id: campaign.owner_id,
        template_id: campaign.template_id,
        status: campaign.status
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      owner_id: data.owner_id,
      template_id: data.template_id,
      status: data.status,
      created_at: new Date(data.created_at),
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined
    };
  }

  async updateCampaignStatus(
    id: string,
    ownerId: string,
    status: Campaign['status'],
    completedAt?: Date
  ): Promise<void> {
    const { error } = await this.client
      .from('campaigns')
      .update({
        status,
        completed_at: completedAt?.toISOString()
      })
      .eq('id', id)
      .eq('owner_id', ownerId);

    if (error) throw error;
  }

  async getCampaignItems(campaignId: string): Promise<CampaignItem[]> {
    const { data, error } = await this.client
      .from('campaign_items')
      .select('*')
      .eq('campaign_id', campaignId);

    if (error) throw error;

    return data.map(i => ({
      id: i.id,
      campaign_id: i.campaign_id,
      destination_id: i.destination_id,
      status: i.status,
      last_error: i.last_error,
      sent_at: i.sent_at ? new Date(i.sent_at) : undefined
    }));
  }

  async createCampaignItems(items: Omit<CampaignItem, 'id'>[]): Promise<void> {
    const { error } = await this.client
      .from('campaign_items')
      .insert(items.map(item => ({
        campaign_id: item.campaign_id,
        destination_id: item.destination_id,
        status: item.status
      })));

    if (error) throw error;
  }

  async updateCampaignItem(
    id: string,
    status: CampaignItem['status'],
    error?: string,
    sentAt?: Date
  ): Promise<void> {
    const { error: updateError } = await this.client
      .from('campaign_items')
      .update({
        status,
        last_error: error,
        sent_at: sentAt?.toISOString()
      })
      .eq('id', id);

    if (updateError) throw updateError;
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
    const { data, error } = await this.client
      .from('app_config')
      .select('*')
      .eq('app', app)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      app: data.app,
      config: data.config,
      updated_at: new Date(data.updated_at)
    };
  }

  async setAppConfig(app: string, config: AppConfig['config']): Promise<void> {
    const { error } = await this.client
      .from('app_config')
      .upsert({
        app,
        config,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  async getUserPreference(telegramId: string, app: string): Promise<UserPreference | null> {
    const { data, error } = await this.client
      .from('user_preferences')
      .select('*')
      .eq('telegram_id', telegramId)
      .eq('app', app)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      telegram_id: data.telegram_id,
      app: data.app,
      mode: data.mode,
      updated_at: new Date(data.updated_at)
    };
  }

  async setUserPreference(telegramId: string, app: string, mode: 'demo' | 'real'): Promise<void> {
    const { error } = await this.client
      .from('user_preferences')
      .upsert({
        telegram_id: telegramId,
        app,
        mode,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }
}
