import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql, eq } from 'drizzle-orm';
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
import * as schema from './schema';

export class PgStore implements DataStore {
  private db: PostgresJsDatabase<typeof schema>;
  private ownerId: string; // Store ownerId for convenience in methods

  constructor(connectionString: string, ownerId: string) {
    const client = postgres(connectionString);
    this.db = drizzle(client, { schema });
    this.ownerId = ownerId;
  }

  // --- Profiles ---
  async getProfile(telegramId: string): Promise<Profile | null> {
    const result = await this.db.query.pgProfiles.findFirst({
      where: eq(schema.pgProfiles.telegram_id, telegramId),
    });
    return result ? { ...result, telegram_id: result.telegram_id.toString() } : null;
  }

  async createProfile(profile: Omit<Profile, 'created_at'>): Promise<Profile> {
    const [newProfile] = await this.db.insert(schema.pgProfiles).values({
      ...profile,
      telegram_id: profile.telegram_id.toString(),
      created_at: new Date(),
      updated_at: new Date(),
    }).returning();
    return { ...newProfile, telegram_id: newProfile.telegram_id.toString() };
  }

  // --- Templates ---
  async getTemplates(ownerId: string): Promise<Template[]> {
    const results = await this.db.query.pgTemplates.findMany({
      where: eq(schema.pgTemplates.owner_id, ownerId),
    });
    return results.map(t => ({ ...t, owner_id: t.owner_id.toString() }));
  }

  async getTemplate(id: string, ownerId: string): Promise<Template | null> {
    const result = await this.db.query.pgTemplates.findFirst({
      where: eq(schema.pgTemplates.id, id) && eq(schema.pgTemplates.owner_id, ownerId),
    });
    return result ? { ...result, owner_id: result.owner_id.toString() } : null;
  }

  async createTemplate(template: Omit<Template, 'id' | 'created_at'>): Promise<Template> {
    const [newTemplate] = await this.db.insert(schema.pgTemplates).values({
      ...template,
      owner_id: template.owner_id.toString(),
      created_at: new Date(),
    }).returning();
    return { ...newTemplate, owner_id: newTemplate.owner_id.toString() };
  }

  async updateTemplate(id: string, ownerId: string, updates: Partial<Template>): Promise<void> {
    await this.db.update(schema.pgTemplates)
      .set({ ...updates, owner_id: ownerId.toString() })
      .where(eq(schema.pgTemplates.id, id) && eq(schema.pgTemplates.owner_id, ownerId));
  }

  async deleteTemplate(id: string, ownerId: string): Promise<void> {
    await this.db.delete(schema.pgTemplates)
      .where(eq(schema.pgTemplates.id, id) && eq(schema.pgTemplates.owner_id, ownerId));
  }

  // --- Destinations ---
  async getDestinations(ownerId: string): Promise<Destination[]> {
    const results = await this.db.query.pgDestinations.findMany({
      where: eq(schema.pgDestinations.owner_id, ownerId),
    });
    return results.map(d => ({ ...d, owner_id: d.owner_id.toString() }));
  }

  async getDestination(id: string, ownerId: string): Promise<Destination | null> {
    const result = await this.db.query.pgDestinations.findFirst({
      where: eq(schema.pgDestinations.id, id) && eq(schema.pgDestinations.owner_id, ownerId),
    });
    return result ? { ...result, owner_id: result.owner_id.toString() } : null;
  }

  async createDestination(destination: Omit<Destination, 'id' | 'created_at'>): Promise<Destination> {
    const [newDestination] = await this.db.insert(schema.pgDestinations).values({
      ...destination,
      owner_id: destination.owner_id.toString(),
      created_at: new Date(),
    }).returning();
    return { ...newDestination, owner_id: newDestination.owner_id.toString() };
  }

  async deleteDestination(id: string, ownerId: string): Promise<void> {
    await this.db.delete(schema.pgDestinations)
      .where(eq(schema.pgDestinations.id, id) && eq(schema.pgDestinations.owner_id, ownerId));
  }

  // --- Campaigns ---
  async getCampaigns(ownerId: string): Promise<Campaign[]> {
    const results = await this.db.query.pgCampaigns.findMany({
      where: eq(schema.pgCampaigns.owner_id, ownerId),
    });
    return results.map(c => ({ ...c, owner_id: c.owner_id.toString() }));
  }

  async getCampaign(id: string, ownerId: string): Promise<Campaign | null> {
    const result = await this.db.query.pgCampaigns.findFirst({
      where: eq(schema.pgCampaigns.id, id) && eq(schema.pgCampaigns.owner_id, ownerId),
    });
    return result ? { ...result, owner_id: result.owner_id.toString() } : null;
  }

  async createCampaign(campaign: Omit<Campaign, 'id' | 'created_at'>): Promise<Campaign> {
    const [newCampaign] = await this.db.insert(schema.pgCampaigns).values({
      ...campaign,
      owner_id: campaign.owner_id.toString(),
      created_at: new Date(),
    }).returning();
    return { ...newCampaign, owner_id: newCampaign.owner_id.toString() };
  }

  async updateCampaignStatus(id: string, ownerId: string, status: Campaign['status'], completedAt?: Date): Promise<void> {
    await this.db.update(schema.pgCampaigns)
      .set({ status, completed_at: completedAt })
      .where(eq(schema.pgCampaigns.id, id) && eq(schema.pgCampaigns.owner_id, ownerId));
  }

  // --- Campaign Items ---
  async getCampaignItems(campaignId: string): Promise<CampaignItem[]> {
    const results = await this.db.query.pgCampaignItems.findMany({
      where: eq(schema.pgCampaignItems.campaign_id, campaignId),
    });
    return results;
  }

  async createCampaignItems(items: Omit<CampaignItem, 'id'>[]): Promise<void> {
    if (items.length === 0) return;
    await this.db.insert(schema.pgCampaignItems).values(items.map(item => ({
      ...item,
      id: sql`gen_random_uuid()`, // Let DB generate UUID
    })));
  }

  async updateCampaignItem(id: string, status: CampaignItem['status'], error?: string, sentAt?: Date): Promise<void> {
    await this.db.update(schema.pgCampaignItems)
      .set({ status, last_error: error, sent_at: sentAt })
      .where(eq(schema.pgCampaignItems.id, id));
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

  // --- App Config ---
  async getAppConfig(app: string): Promise<AppConfig | null> {
    const result = await this.db.query.pgAppConfig.findFirst({
      where: eq(schema.pgAppConfig.app, app),
    });
    return result ? { ...result, config: result.config as AppConfig['config'] } : null;
  }

  async setAppConfig(app: string, config: AppConfig['config']): Promise<void> {
    await this.db.insert(schema.pgAppConfig)
      .values({ app, config, updated_at: new Date() })
      .onConflictDoUpdate({
        target: schema.pgAppConfig.app,
        set: { config, updated_at: new Date() },
      });
  }

  // --- User Preferences ---
  async getUserPreference(telegramId: string, app: string): Promise<UserPreference | null> {
    const result = await this.db.query.pgUserPrefs.findFirst({
      where: eq(schema.pgUserPrefs.telegram_id, telegramId) && eq(schema.pgUserPrefs.app, app),
    });
    return result ? { ...result, telegram_id: result.telegram_id.toString() } : null;
  }

  async setUserPreference(telegramId: string, app: string, mode: 'demo' | 'real'): Promise<void> {
    await this.db.insert(schema.pgUserPrefs)
      .values({ telegram_id: telegramId.toString(), app, mode, updated_at: new Date() })
      .onConflictDoUpdate({
        target: [schema.pgUserPrefs.telegram_id, schema.pgUserPrefs.app],
        set: { mode, updated_at: new Date() },
      });
  }
}