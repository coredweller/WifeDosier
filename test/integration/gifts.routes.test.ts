import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/main.js';
import type { IGiftService } from '../../src/services/gift.service.interface.js';
import { ok, fail } from '../../src/domain/errors.js';
import { newGiftId } from '../../src/domain/gift.js';
import type { Gift, GiftId } from '../../src/domain/gift.js';

// ── Stub service factory ───────────────────────────────────────────────────────
function makeStubService(overrides: Partial<IGiftService> = {}): IGiftService {
  return {
    listAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(fail({ kind: 'NotFound', id: 'stub' })),
    create: vi.fn().mockResolvedValue(fail({ kind: 'ValidationError', message: 'stub' })),
    delete: vi.fn().mockResolvedValue(fail({ kind: 'NotFound', id: 'stub' })),
    ...overrides,
  };
}

const sampleDate = new Date('2024-12-25T00:00:00.000Z');

// ── POST /api/v1/gifts ────────────────────────────────────────────────────────
describe('POST /api/v1/gifts', () => {
  let app: FastifyInstance;

  const createdGift: Gift = {
    id: newGiftId(),
    title: 'Flowers',
    occasion: 'Anniversary',
    notes: null,
    liked: false,
    givenAt: sampleDate,
    createdAt: new Date(),
  };

  const plannedGift: Gift = {
    id: newGiftId(),
    title: 'Concert tickets',
    occasion: 'Birthday',
    notes: null,
    liked: false,
    givenAt: null,
    createdAt: new Date(),
  };

  beforeAll(async () => {
    app = await buildApp({
      service: makeStubService({
        create: vi.fn()
          .mockResolvedValueOnce(ok(createdGift))   // with givenAt → 201
          .mockResolvedValueOnce(ok(plannedGift))    // without givenAt → 201
          .mockResolvedValue(fail({ kind: 'ValidationError', message: 'blank' })),
      }),
    });
  });

  afterAll(() => app.close());

  it('201 with created gift for payload with givenAt', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/gifts',
      payload: { title: 'Flowers', occasion: 'Anniversary', givenAt: '2024-12-25' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<Gift>();
    expect(body.title).toBe('Flowers');
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('201 with planned gift when givenAt is omitted', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/gifts',
      payload: { title: 'Concert tickets', occasion: 'Birthday' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json<Gift>().givenAt).toBeNull();
  });

  it('400 for empty title (Zod rejects before service is called)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/gifts',
      payload: { title: '', occasion: 'Anniversary' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('400 when required fields are missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/gifts',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });
});

// ── GET /api/v1/gifts/:id ─────────────────────────────────────────────────────
describe('GET /api/v1/gifts/:id', () => {
  let app: FastifyInstance;

  const existingGift: Gift = {
    id: newGiftId(),
    title: 'Chocolate box',
    occasion: 'Birthday',
    notes: 'Dark chocolate',
    liked: true,
    givenAt: sampleDate,
    createdAt: new Date(),
  };
  const missingId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    app = await buildApp({
      service: makeStubService({
        getById: vi.fn()
          .mockImplementation((id: GiftId) =>
            Promise.resolve(id === existingGift.id
              ? ok(existingGift)
              : fail({ kind: 'NotFound', id })),
          ),
      }),
    });
  });

  afterAll(() => app.close());

  it('200 with gift when found', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/gifts/${existingGift.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<Gift>().title).toBe('Chocolate box');
  });

  it('404 for unknown ID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/gifts/${missingId}`,
    });

    expect(response.statusCode).toBe(404);
  });
});

// ── DELETE /api/v1/gifts/:id ──────────────────────────────────────────────────
describe('DELETE /api/v1/gifts/:id', () => {
  let app: FastifyInstance;
  const existingId = newGiftId();
  const missingId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    app = await buildApp({
      service: makeStubService({
        delete: vi.fn()
          .mockImplementation((id: GiftId) =>
            Promise.resolve(id === existingId
              ? ok(true as const)
              : fail({ kind: 'NotFound', id })),
          ),
      }),
    });
  });

  afterAll(() => app.close());

  it('204 when gift is deleted', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/gifts/${existingId}`,
    });

    expect(response.statusCode).toBe(204);
  });

  it('404 when gift does not exist', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/gifts/${missingId}`,
    });

    expect(response.statusCode).toBe(404);
  });
});
