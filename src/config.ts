import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

// Throws at startup if required env vars are missing or invalid.
// Never access process.env directly elsewhere — import `config` instead.
export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
