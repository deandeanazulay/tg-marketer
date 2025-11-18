import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../data/schema';
import { AppConfig } from '../data/types';

async function seedAppConfig() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Cannot seed app_config.');
    process.exit(1);
  }

  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql, { schema });

  console.log('Seeding default app_config...');
  try {
    const appName = 'miniapp';
    let appConfig: AppConfig | null = await db.query.pgAppConfig.findFirst({
      where: eq(schema.pgAppConfig.app, appName),
    });

    if (!appConfig) {
      const defaultConfig: AppConfig['config'] = {
        adapters: { data: 'mock' },
        features: { someFeature: true },
        ui: { brand: 'TG Marketer', accent: '#0088cc' },
        defaults: { mode: 'demo' }
      };
      await db.insert(schema.pgAppConfig).values({
        app: appName,
        config: defaultConfig,
        updated_at: new Date(),
      });
      console.log('Default app_config seeded successfully.');
    } else {
      console.log('app_config already exists, skipping seed.');
    }
  } catch (error) {
    console.error('Failed to seed app_config:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seedAppConfig();