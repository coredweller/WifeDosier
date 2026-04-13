import { eq } from 'drizzle-orm';
import type { Logger } from 'pino';
import type { Db } from '../db.js';
import { reconstituteGift, type Gift, type GiftId } from '../domain/gift.js';
import { gifts } from '../schema/gifts.schema.js';
import type { IGiftRepository } from './gift.repository.interface.js';

export class DrizzleGiftRepository implements IGiftRepository {
  constructor(
    private readonly db: Db,
    private readonly log: Logger,
  ) {}

  async findAll(): Promise<readonly Gift[]> {
    this.log.debug('Fetching all gifts');
    const rows = await this.db
      .select()
      .from(gifts)
      .orderBy(gifts.givenAt);
    return rows.map((r) =>
      reconstituteGift(r.id, r.title, r.occasion, r.notes, r.liked, r.givenAt, r.createdAt),
    );
  }

  async findById(id: GiftId): Promise<Gift | null> {
    const rows = await this.db
      .select()
      .from(gifts)
      .where(eq(gifts.id, id))
      .limit(1);

    const row = rows[0];
    return row
      ? reconstituteGift(row.id, row.title, row.occasion, row.notes, row.liked, row.givenAt, row.createdAt)
      : null;
  }

  async save(gift: Gift): Promise<Gift> {
    this.log.debug({ giftId: gift.id }, 'Saving gift');
    await this.db.insert(gifts).values({
      id: gift.id,
      title: gift.title,
      occasion: gift.occasion,
      notes: gift.notes,
      liked: gift.liked,
      givenAt: gift.givenAt,
      createdAt: gift.createdAt,
    });
    return gift;
  }

  async deleteById(id: GiftId): Promise<boolean> {
    const deleted = await this.db
      .delete(gifts)
      .where(eq(gifts.id, id))
      .returning({ id: gifts.id });
    return deleted.length > 0;
  }
}
