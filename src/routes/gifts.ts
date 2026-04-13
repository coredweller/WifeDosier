import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { AppError } from '../domain/errors.js';
import { giftIdFrom } from '../domain/gift.js';
import type { IGiftService } from '../services/gift.service.interface.js';

// ── HTTP translation — maps domain errors to status codes ──────────────────
function statusFor(error: AppError): 400 | 404 | 409 {
  switch (error.kind) {
    case 'NotFound':        return 404;
    case 'ValidationError': return 400;
    case 'Conflict':        return 409;
  }
}

// ── Zod schemas ────────────────────────────────────────────────────────────
const GiftSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  occasion: z.string(),
  notes: z.string().nullable(),
  liked: z.boolean(),
  givenAt: z.date().nullable(),
  createdAt: z.date(),
});

const CreateGiftSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
  occasion: z.string().min(1, 'Occasion is required').max(100, 'Occasion must not exceed 100 characters'),
  // Optional — omit for planned (future) gifts, provide for already-given gifts
  givenAt: z.coerce.date().optional(),
  notes: z.string().max(1000, 'Notes must not exceed 1000 characters').optional(),
  liked: z.boolean().optional(),
});

const GiftIdParamSchema = z.object({
  id: z.string().uuid('Invalid gift ID format'),
});

const ProblemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  instance: z.string(),
});

// ── Factory — injects service dependency, returns a Fastify plugin ─────────
export function giftsPlugin(service: IGiftService): FastifyPluginCallbackZod {
  return function (app, _opts, done) {
    // GET /gifts
    app.get(
      '/gifts',
      { schema: { response: { 200: z.array(GiftSchema) } } },
      async () => {
        const items = await service.listAll();
        // Spread to convert `readonly Gift[]` to mutable — Fastify's serializer expects
        // a mutable array; spreading preserves elements without copying buffers.
        return [...items];
      },
    );

    // GET /gifts/:id
    app.get(
      '/gifts/:id',
      {
        schema: {
          params: GiftIdParamSchema,
          response: {
            200: GiftSchema,
            404: ProblemDetailsSchema,
          },
        },
      },
      async (request, reply) => {
        const result = await service.getById(giftIdFrom(request.params.id));

        if (!result.ok) {
          return reply.status(404).send({
            type: 'https://tools.ietf.org/html/rfc7807',
            title: `Gift ${request.params.id} not found.`,
            status: 404,
            instance: request.url,
          });
        }

        return result.value;
      },
    );

    // POST /gifts
    app.post(
      '/gifts',
      {
        schema: {
          body: CreateGiftSchema,
          response: {
            201: GiftSchema,
            400: ProblemDetailsSchema,
            409: ProblemDetailsSchema,
          },
        },
      },
      async (request, reply) => {
        const { title, occasion, ...options } = request.body;
        const result = await service.create(title, occasion, options);

        if (!result.ok) {
          // create() only returns ValidationError or Conflict — never NotFound.
          const status: 400 | 409 = result.error.kind === 'ValidationError' ? 400 : 409;
          return reply.status(status).send({
            type: 'https://tools.ietf.org/html/rfc7807',
            title: result.error.kind === 'ValidationError' ? result.error.message : 'Bad Request',
            status,
            instance: request.url,
          });
        }

        return reply.status(201).send(result.value);
      },
    );

    // DELETE /gifts/:id
    app.delete(
      '/gifts/:id',
      {
        schema: {
          params: GiftIdParamSchema,
          response: {
            204: z.undefined(),
            404: ProblemDetailsSchema,
          },
        },
      },
      async (request, reply) => {
        const result = await service.delete(giftIdFrom(request.params.id));

        if (!result.ok) {
          return reply.status(404).send({
            type: 'https://tools.ietf.org/html/rfc7807',
            title: `Gift ${request.params.id} not found.`,
            status: 404,
            instance: request.url,
          });
        }

        return reply.status(204).send();
      },
    );

    done();
  };
}
