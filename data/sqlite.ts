import { drizzle, type SQLiteDatabase } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
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

// Note: better-sqlite3 is a native module and might not work in all serverless environments
// For WebContainer, this will likely fail. A pure JS alternative like sql.js would be needed,
// but sql.js does not support SQLCipher. This implementation assumes a compatible Node.js environment.

export class SqliteStore implements DataStore {
  private db: SQLiteDatabase<typeof schema>;
  private ownerId: string; // Store ownerId for convenience in methods

  constructor(dbPath: string, ownerId: string, sqliteKey?: string) {
    const sqlite = new Database(dbPath);

    // Apply pragmas
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('synchronous = NORMAL');
    sqlite.pragma('foreign_keys = ON');

    // If SQLCipher key is provided, attempt to set it
    if (sqliteKey) {
      // This is a placeholder. Actual SQLCipher integration requires a specific build
      // of better-sqlite3 with SQLCipher support, and the key command might vary.
      // For a standard better-sqlite3, this line would cause an error.
      // sqlite.exec(`PRAGMA key = '${sqliteKey}';`);
      console.warn('SQLCipher key provided, but better-sqlite3 might not have SQLCipher support compiled in.');
    }

    this.db = drizzle(sqlite, { schema });
    this.ownerId = ownerId;
  }

  // --- Profiles ---
  async getProfile(telegramId: string): Promise<Profile | null> {
    const result = await this.db.query.sqliteProfiles.findFirst({
      where: eq(schema.sqliteProfiles.telegram_id, telegramId),
    });
    return result ? { ...result, telegram_id: result.telegram_id.toString() } : null;
  }

  async createProfile(profile: Omit<Profile, 'created_at'>): Promise<Profile> {
    const [newProfile] = await this.db.insert(schema.sqliteProfiles).values({
      ...profile,
      telegram_id: profile.telegram_id.toString(),
      created_at: new Date(),
      updated_at: new Date(),
    }).returning();
    return { ...newProfile, telegram_id: newProfile.telegram_id.toString() };
  }

  // --- Templates ---
  async getTemplates(ownerId: string): Promise<Template[]> {
    const results = await this.db.query.sqliteTemplates.findMany({
      where: eq(schema.sqliteTemplates.owner_id, ownerId),
    });
    return results.map(t => ({ ...t, owner_id: t.owner_id.toString() }));
  }

  async getTemplate(id: string, ownerId: string): Promise<Template | null> {
    const result = await this.db.query.sqliteTemplates.findFirst({
      where: eq(schema.sqliteTemplates.id, id) && eq(schema.sqliteTemplates.owner_id, ownerId),
    });
    return result ? { ...result, owner_id: result.owner_id.toString() } : null;
  }

  async createTemplate(template: Omit<Template, 'id' | 'created_at'>): Promise<Template> {
    const [newTemplate] = await this.db.insert(schema.sqliteTemplates).values({
      ...template,
      owner_id: template.owner_id.toString(),
      created_at: new Date(),
    }).returning();
    return { ...newTemplate, owner_id: newTemplate.owner_id.toString() };
  }

  async updateTemplate(id: string, ownerId: string, updates: Partial<Template>): Promise<void> {
    await this.db.update(schema.sqliteTemplates)
      .set({ ...updates, owner_id: ownerId.toString() })
      .where(eq(schema.sqliteTemplates.id, id) && eq(schema.sqliteTemplates.owner_id, ownerId));
  }

  async deleteTemplate(id: string, ownerId: string): Promise<void> {
    await this.db.delete(schema.sqliteTemplates)
      .where(eq(schema.sqliteTemplates.id, id) && eq(schema.sqliteTemplates.owner_id, ownerId));
  }

  // --- Destinations ---
  async getDestinations(ownerId: string): Promise<Destination[]> {
    const results = await this.db.query.sqliteDestinations.findMany({
      where: eq(schema.sqliteDestinations.owner_id, ownerId),
    });
    return results.map(d => ({ ...d, owner_id: d.owner_id.toString() }));
  }

  async getDestination(id: string, ownerId: string): Promise<Destination | null> {
    const result = await this.db.query.sqliteDestinations.findFirst({
      where: eq(schema.sqliteDestinations.id, id) && eq(schema.sqliteDestinations.owner_id, ownerId),
    });
    return result ? { ...result, owner_id: result.owner_id.toString() } : null;
  }

  async createDestination(destination: Omit<Destination, 'id' | 'created_at'>): Promise<Destination> {
    const [newDestination] = await this.db.insert(schema.sqliteDestinations).values({
      ...destination,
      owner_id: destination.owner_id.toString(),
      created_at: new Date(),
    }).returning();
    return { ...newDestination, owner_id: newDestination.owner_id.toString() };
  }

  async deleteDestination(id: string, ownerId: string): Promise<void> {
    await this.db.delete(schema.sqliteDestinations)
      .where(eq(schema.sqliteDestinations.id, id) && eq(schema.sqliteDestinations.owner_id, ownerId));
  }

  // --- Campaigns ---
  async getCampaigns(ownerId: string): Promise<Campaign[]> {
    const results = await this.db.query.sqliteCampaigns.findMany({
      where: eq(schema.sqliteCampaigns.owner_id, ownerId),
    });
    return results.map(c => ({ ...c, owner_id: c.owner_id.toString() }));
  }

  async getCampaign(id: string, ownerId: string): Promise<Campaign | null> {
    const result = await this.db.query.sqliteCampaigns.findFirst({
      where: eq(schema.sqliteCampaigns.id, id) && eq(schema.sqliteCampaigns.owner_id, ownerId),
    });
    return result ? { ...result, owner_id: result.owner_id.toString() } : null;
  }

  async createCampaign(campaign: Omit<Campaign, 'id' | 'created_at'>): Promise<Campaign> {
    const [newCampaign] = await this.db.insert(schema.sqliteCampaigns).values({
      ...campaign,
      owner_id: campaign.owner_id.toString(),
      created_at: new Date(),
    }).returning();
    return { ...newCampaign, owner_id: newCampaign.owner_id.toString() };
  }

  async updateCampaignStatus(id: string, ownerId: string, status: Campaign['status'], completedAt?: Date): Promise<void> {
    await this.db.update(schema.sqliteCampaigns)
      .set({ status, completed_at: completedAt })
      .where(eq(schema.sqliteCampaigns.id, id) && eq(schema.sqliteCampaigns.owner_id, ownerId));
  }

  // --- Campaign Items ---
  async getCampaignItems(campaignId: string): Promise<CampaignItem[]> {
    const results = await this.db.query.sqliteCampaignItems.findMany({
      where: eq(schema.sqliteCampaignItems.campaign_id, campaignId),
    });
    return results;
  }

  async createCampaignItems(items: Omit<CampaignItem, 'id'>[]): Promise<void> {
    if (items.length === 0) return;
    await this.db.insert(schema.sqliteCampaignItems).values(items.map(item => ({
      ...item,
      id: sql`(lower(hex(randomblob(16))))`, // Let DB generate UUID
    })));
  }

  async updateCampaignItem(id: string, status: CampaignItem['status'], error?: string, sentAt?: Date): Promise<void> {
    await this.db.update(schema.sqliteCampaignItems)
      .set({ status, last_error: error, sent_at: sentAt })
      .where(eq(schema.sqliteCampaignItems.id, id));
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
    const result = await this.db.query.sqliteAppConfig.findFirst({
      where: eq(schema.sqliteAppConfig.app, app),
    });
    return result ? { ...result, config: result.config as AppConfig['config'] } : null;
  }

  async setAppConfig(app: string, config: AppConfig['config']): Promise<void> {
    await this.db.insert(schema.sqliteAppConfig)
      .values({ app, config, updated_at: new Date() })
      .onConflictDoUpdate({
        target: schema.sqliteAppConfig.app,
        set: { config, updated_at: new Date() },
      });
  }

  // --- User Preferences ---
  async getUserPreference(telegramId: string, app: string): Promise<UserPreference | null> {
    const result = await this.db.query.sqliteUserPrefs.findFirst({
      where: eq(schema.sqliteUserPrefs.telegram_id, telegramId) && eq(schema.sqliteUserPrefs.app, app),
    });
    return result ? { ...result, telegram_id: result.telegram_id.toString() } : null;
  }

  async setUserPreference(telegramId: string, app: string, mode: 'demo' | 'real'): Promise<void> {
    await this.db.insert(schema.sqliteUserPrefs)
      .values({ telegram_id: telegramId.toString(), app, mode, updated_at: new Date() })
      .onConflictDoUpdate({
        target: [schema.sqliteUserPrefs.telegram_id, schema.sqliteUserPrefs.app],
        set: { mode, updated_at: new Date() },
      });
  }
}