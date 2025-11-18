import { pgTable, text, timestamp, jsonb, boolean, pgEnum, uniqueIndex, bigint } from 'drizzle-orm/pg-core';
import { sqliteTable, integer, unique, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Enums
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'running', 'done', 'failed']);
export const campaignItemStatusEnum = pgEnum('campaign_item_status', ['pending', 'sent', 'failed']);
export const destinationTypeEnum = pgEnum('destination_type', ['channel', 'group', 'private']);
export const userModeEnum = pgEnum('user_mode', ['demo', 'real']);

// --- PostgreSQL Schema ---
export const pgProfiles = pgTable('profiles', {
  telegram_id: text('telegram_id').primaryKey(),
  username: text('username'),
  first_name: text('first_name').notNull(),
  last_name: text('last_name'),
  language_code: text('language_code'),
  is_premium: boolean('is_premium').default(false),
  role: text('role').default('user').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const pgTemplates = pgTable('templates', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  owner_id: text('owner_id').notNull(),
  name: text('name').notNull().unique(),
  content: text('content').notNull(),
  variables: jsonb('variables').default({}).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const pgDestinations = pgTable('destinations', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  owner_id: text('owner_id').notNull(),
  chat_id: text('chat_id').notNull(),
  title: text('title').notNull(),
  type: destinationTypeEnum('type').notNull(),
  can_send: boolean('can_send').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const pgCampaigns = pgTable('campaigns', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  owner_id: text('owner_id').notNull(),
  template_id: text('template_id').notNull(),
  status: campaignStatusEnum('status').default('draft').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
});

export const pgCampaignItems = pgTable('campaign_items', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  campaign_id: text('campaign_id').notNull(),
  destination_id: text('destination_id').notNull(),
  status: campaignItemStatusEnum('status').default('pending').notNull(),
  last_error: text('last_error'),
  sent_at: timestamp('sent_at'),
});

export const pgAppConfig = pgTable('app_config', {
  app: text('app').primaryKey(),
  config: jsonb('config').notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const pgUserPrefs = pgTable('user_prefs', {
  telegram_id: text('telegram_id').notNull(),
  app: text('app').notNull(),
  mode: userModeEnum('mode').notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    pk: uniqueIndex('user_prefs_pk').on(table.telegram_id, table.app),
  };
});


// --- SQLite Schema ---
export const sqliteProfiles = sqliteTable('profiles', {
  telegram_id: text('telegram_id').primaryKey(),
  username: text('username'),
  first_name: text('first_name').notNull(),
  last_name: text('last_name'),
  language_code: text('language_code'),
  is_premium: integer('is_premium', { mode: 'boolean' }).default(false),
  role: text('role').default('user').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export const sqliteTemplates = sqliteTable('templates', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  owner_id: text('owner_id').notNull(),
  name: text('name').notNull().unique(),
  content: text('content').notNull(),
  variables: text('variables', { mode: 'json' }).default('{}').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export const sqliteDestinations = sqliteTable('destinations', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  owner_id: text('owner_id').notNull(),
  chat_id: text('chat_id').notNull(),
  title: text('title').notNull(),
  type: text('type', { enum: ['channel', 'group', 'private'] }).notNull(),
  can_send: integer('can_send', { mode: 'boolean' }).default(true).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export const sqliteCampaigns = sqliteTable('campaigns', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  owner_id: text('owner_id').notNull(),
  template_id: text('template_id').notNull(),
  status: text('status', { enum: ['draft', 'running', 'done', 'failed'] }).default('draft').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
  completed_at: integer('completed_at', { mode: 'timestamp' }),
});

export const sqliteCampaignItems = sqliteTable('campaign_items', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  campaign_id: text('campaign_id').notNull(),
  destination_id: text('destination_id').notNull(),
  status: text('status', { enum: ['pending', 'sent', 'failed'] }).default('pending').notNull(),
  last_error: text('last_error'),
  sent_at: integer('sent_at', { mode: 'timestamp' }),
});

export const sqliteAppConfig = sqliteTable('app_config', {
  app: text('app').primaryKey(),
  config: text('config', { mode: 'json' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export const sqliteUserPrefs = sqliteTable('user_prefs', {
  telegram_id: text('telegram_id').notNull(),
  app: text('app').notNull(),
  mode: text('mode', { enum: ['demo', 'real'] }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => {
  return {
    pk: unique('user_prefs_pk').on(table.telegram_id, table.app),
  };
});