import { defineConfig } from 'drizzle-kit';

// Read DATABASE_URL directly — do NOT import src/config.js here.
// src/config.js executes z.parse(process.env) at import time, which requires
// ALL app env vars. drizzle-kit only needs DATABASE_URL.
const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required for drizzle-kit');
}

export default defineConfig({
  schema: './src/schema/gifts.schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
