import type { Gift, GiftId } from '../domain/gift.js';

export interface IGiftRepository {
  findAll(): Promise<readonly Gift[]>;
  findById(id: GiftId): Promise<Gift | null>;
  save(gift: Gift): Promise<Gift>;
  deleteById(id: GiftId): Promise<boolean>;
}
