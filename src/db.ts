import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from './config.js';
import * as schema from './schema/gifts.schema.js';

const client = postgres(config.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
});

export const db = drizzle(client, { schema });
export type Db = typeof db;
