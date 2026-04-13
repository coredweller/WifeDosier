import type { Logger } from 'pino';
import { createGift, type Gift, type GiftId } from '../domain/gift.js';
import { fail, ok, type Result } from '../domain/errors.js';
import type { IGiftRepository } from '../repositories/gift.repository.interface.js';
import type { IGiftService } from './gift.service.interface.js';

export class GiftService implements IGiftService {
  constructor(
    private readonly repository: IGiftRepository,
    private readonly log: Logger,
  ) {}

  async listAll(): Promise<readonly Gift[]> {
    this.log.debug('Listing all gifts');
    return this.repository.findAll();
  }

  async getById(id: GiftId): Promise<Result<Gift>> {
    const gift = await this.repository.findById(id);

    if (!gift) {
      this.log.warn({ giftId: id }, 'Gift not found');
      return fail({ kind: 'NotFound', id });
    }

    return ok(gift);
  }

  async create(
    title: string,
    occasion: string,
    options: { givenAt?: Date | undefined; notes?: string | undefined; liked?: boolean | undefined } = {},
  ): Promise<Result<Gift>> {
    if (!title.trim()) {
      return fail({ kind: 'ValidationError', message: 'Title must not be blank.' });
    }

    if (!occasion.trim()) {
      return fail({ kind: 'ValidationError', message: 'Occasion must not be blank.' });
    }

    const gift = createGift(title, occasion, options);
    await this.repository.save(gift);

    this.log.info({ giftId: gift.id, title: gift.title }, 'Gift created');
    return ok(gift);
  }

  async delete(id: GiftId): Promise<Result<true>> {
    const deleted = await this.repository.deleteById(id);

    if (!deleted) {
      this.log.warn({ giftId: id }, 'Delete failed — gift not found');
      return fail({ kind: 'NotFound', id });
    }

    this.log.info({ giftId: id }, 'Gift deleted');
    return ok(true);
  }
}
