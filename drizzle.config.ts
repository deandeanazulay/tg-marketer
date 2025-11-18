import type { Config } from 'drizzle-kit';

export default {
  schema: './data/schema.ts',
  out: './drizzle', // Output directory for migrations
  driver: 'pg', // Or 'sqlite' for SQLite migrations
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;