import type { Gift, GiftId } from '../domain/gift.js';
import type { Result } from '../domain/errors.js';

export interface IGiftService {
  listAll(): Promise<readonly Gift[]>;
  getById(id: GiftId): Promise<Result<Gift>>;
  create(
    title: string,
    occasion: string,
    // `| undefined` on each value matches Zod's inferred type for `.optional()` fields,
    // which is required for exactOptionalPropertyTypes compatibility.
    options?: { givenAt?: Date | undefined; notes?: string | undefined; liked?: boolean | undefined },
  ): Promise<Result<Gift>>;
  delete(id: GiftId): Promise<Result<true>>;
}
