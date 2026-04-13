import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { pino } from 'pino';
import { config } from './config.js';
import { db } from './db.js';
import { DrizzleGiftRepository } from './repositories/gift.repository.js';
import { GiftService } from './services/gift.service.js';
import type { IGiftService } from './services/gift.service.interface.js';
import { giftsPlugin } from './routes/gifts.js';

// Optional deps allow tests to inject stub implementations without vi.mock()
interface AppDeps {
  service?: IGiftService;
}

export async function buildApp(deps: AppDeps = {}) {
  // Run pending migrations before accepting traffic.
  if (config.NODE_ENV !== 'test') {
    await migrate(db, { migrationsFolder: './migrations' });
  }

  // Build a typed pino logger — Fastify's built-in logger is FastifyBaseLogger which
  // lacks `msgPrefix` required by pino.Logger. We create the logger explicitly so
  // repository and service constructors receive the correct type.
  const logger = pino({
    level: config.LOG_LEVEL,
    ...(config.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty' } }
      : {}),
  });

  // Pass the pre-built pino instance via `loggerInstance` — Fastify accepts either
  // logger options OR an existing instance, but not both simultaneously.
  const app = Fastify({ loggerInstance: logger });

  // ── Type provider ──────────────────────────────────────────────────────────
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // ── Plugins ────────────────────────────────────────────────────────────────
  await app.register(sensible);

  // ── Error handler (RFC 7807 ProblemDetails) ────────────────────────────────
  app.setErrorHandler((error, request, reply) => {
    const err = error as Error & { statusCode?: number };
    request.log.error({ err }, 'Unhandled error');
    void reply.status(err.statusCode ?? 500).send({
      type: 'https://tools.ietf.org/html/rfc7807',
      title: err.message ?? 'Internal Server Error',
      status: err.statusCode ?? 500,
      instance: request.url,
    });
  });

  // ── Dependencies ───────────────────────────────────────────────────────────
  const repository = new DrizzleGiftRepository(db, logger);
  const service = deps.service ?? new GiftService(repository, logger);

  // ── Routes ─────────────────────────────────────────────────────────────────
  await app.register(giftsPlugin(service), { prefix: '/api/v1' });

  // ── Health check ───────────────────────────────────────────────────────────
  await app.register((api, _opts, done) => {
    api.get('/health', () => ({ status: 'ok' }));
    done();
  }, { prefix: '/api/v1' });

  return app;
}

// Only start the server when this file is the entry point (not in tests)
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await buildApp();
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
}
