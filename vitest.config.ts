import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Hardcode required env vars so config.ts validates at startup without a real .env
    // The DATABASE_URL value is irrelevant — integration tests stub the service layer
    // and never hit the DB. NODE_ENV=test also prevents migrations from running.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://test:test@localhost:5432/test_db',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
    },
  },
});
