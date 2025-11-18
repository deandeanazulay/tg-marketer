import { DataStore, BootstrapConfig } from './types';
import { MockStore } from './mock';
// import { PgStore } from './pg'; // Uncomment when pg.ts is ready
// import { SqliteStore } from './sqlite'; // Uncomment when sqlite.ts is ready

export async function createStore(cfg: BootstrapConfig, mode: "demo" | "real", ownerId: string): Promise<DataStore> {
  if (mode === "demo" || cfg.adapters.data === "mock") {
    return new MockStore();
  } else if (cfg.adapters.data === "postgres") {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set for Postgres adapter.");
    }
    const { PgStore } = await import('./pg');
    return new PgStore(connectionString, ownerId);
  } else if (cfg.adapters.data === "sqlite") {
    const dbPath = process.env.SQLITE_DB_PATH || './data/app.db'; // Default path
    const sqliteKey = process.env.SQLITE_KEY_PATH ? await fetch(process.env.SQLITE_KEY_PATH).then(res => res.text()) : undefined;
    const { SqliteStore } = await import('./sqlite');
    return new SqliteStore(dbPath, ownerId, sqliteKey);
  }
  throw new Error(`Unsupported data adapter: ${cfg.adapters.data}`);
}

export type { DataStore, BootstrapConfig } from './types';