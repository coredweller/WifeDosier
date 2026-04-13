import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from 'pino';
import type { Gift } from '../../src/domain/gift.js';
import { newGiftId, giftIdFrom } from '../../src/domain/gift.js';
import type { IGiftRepository } from '../../src/repositories/gift.repository.interface.js';
import { GiftService } from '../../src/services/gift.service.js';

// ── Stub repository ──────────────────────────────────────────────────────────
function makeRepository(overrides: Partial<IGiftRepository> = {}): IGiftRepository {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockImplementation((gift: Gift) => Promise.resolve(gift)),
    deleteById: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

const noopLog = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as Logger;

const sampleDate = new Date('2024-12-25');

// ── listAll ──────────────────────────────────────────────────────────────────
describe('GiftService.listAll', () => {
  it('returns all gifts from repository', async () => {
    const items: Gift[] = [
      {
        id: newGiftId(),
        title: 'Flowers',
        occasion: 'Anniversary',
        notes: null,
        liked: false,
        givenAt: sampleDate,
        createdAt: new Date(),
      },
    ];
    const repository = makeRepository({ findAll: vi.fn().mockResolvedValue(items) });
    const sut = new GiftService(repository, noopLog);

    const result = await sut.listAll();

    expect(result).toEqual(items);
    expect(vi.mocked(repository.findAll)).toHaveBeenCalledOnce();
  });
});

// ── getById ──────────────────────────────────────────────────────────────────
describe('GiftService.getById', () => {
  it('returns ok with gift when found', async () => {
    const gift: Gift = {
      id: newGiftId(),
      title: 'Flowers',
      occasion: 'Anniversary',
      notes: null,
      liked: true,
      givenAt: sampleDate,
      createdAt: new Date(),
    };
    const repository = makeRepository({ findById: vi.fn().mockResolvedValue(gift) });
    const sut = new GiftService(repository, noopLog);

    const result = await sut.getById(gift.id);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(gift);
  });

  it('returns NotFound error when gift does not exist', async () => {
    const repository = makeRepository({ findById: vi.fn().mockResolvedValue(null) });
    const sut = new GiftService(repository, noopLog);

    const result = await sut.getById(giftIdFrom('00000000-0000-0000-0000-000000000001'));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });
});

// ── create ───────────────────────────────────────────────────────────────────
describe('GiftService.create', () => {
  let repository: IGiftRepository;
  let sut: GiftService;

  beforeEach(() => {
    repository = makeRepository();
    sut = new GiftService(repository, noopLog);
  });

  it('returns created gift with trimmed title and occasion', async () => {
    const result = await sut.create('  Flowers  ', '  Anniversary  ', { givenAt: sampleDate });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe('Flowers');
      expect(result.value.occasion).toBe('Anniversary');
      expect(result.value.id).toBeDefined();
    }
    expect(vi.mocked(repository.save)).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Flowers', occasion: 'Anniversary' }),
    );
  });

  it('defaults liked to false when not provided', async () => {
    const result = await sut.create('Flowers', 'Anniversary');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.liked).toBe(false);
  });

  it('stores liked: true when explicitly provided', async () => {
    const result = await sut.create('Chocolate', 'Birthday', { liked: true, notes: 'Dark chocolate' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.liked).toBe(true);
      expect(result.value.notes).toBe('Dark chocolate');
    }
  });

  it('creates a planned gift with givenAt: null when no date provided', async () => {
    const result = await sut.create('Concert tickets', 'Birthday');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.givenAt).toBeNull();
  });

  it.each(['', '   '])('returns ValidationError for blank title "%s"', async (title) => {
    const result = await sut.create(title, 'Anniversary');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('ValidationError');
    expect(vi.mocked(repository.save)).not.toHaveBeenCalled();
  });

  it.each(['', '   '])('returns ValidationError for blank occasion "%s"', async (occasion) => {
    const result = await sut.create('Flowers', occasion);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('ValidationError');
    expect(vi.mocked(repository.save)).not.toHaveBeenCalled();
  });
});

// ── delete ───────────────────────────────────────────────────────────────────
describe('GiftService.delete', () => {
  it('returns ok(true) when gift is deleted', async () => {
    const id = newGiftId();
    const repository = makeRepository({ deleteById: vi.fn().mockResolvedValue(true) });
    const sut = new GiftService(repository, noopLog);

    const result = await sut.delete(id);

    expect(result.ok).toBe(true);
  });

  it('returns NotFound error when gift does not exist', async () => {
    const repository = makeRepository({ deleteById: vi.fn().mockResolvedValue(false) });
    const sut = new GiftService(repository, noopLog);

    const result = await sut.delete(newGiftId());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('NotFound');
  });
});
