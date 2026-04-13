// ── Branded ID — prevents passing a raw string where GiftId is expected ──
export type GiftId = string & { readonly _brand: 'GiftId' };

export function newGiftId(): GiftId {
  return crypto.randomUUID() as GiftId;
}

export function giftIdFrom(value: string): GiftId {
  return value as GiftId;
}

// ── Aggregate root ─────────────────────────────────────────────────────────
export interface Gift {
  readonly id: GiftId;
  readonly title: string;
  readonly occasion: string;
  readonly notes: string | null;
  // false = not liked / unknown; true = liked. No null — every gift has a known sentiment.
  readonly liked: boolean;
  // null = gift is planned but not yet given; Date = already given
  readonly givenAt: Date | null;
  readonly createdAt: Date;
}

// Factory — only valid Gifts can be constructed
export function createGift(
  title: string,
  occasion: string,
  options: { givenAt?: Date | undefined; notes?: string | undefined; liked?: boolean | undefined } = {},
): Gift {
  return {
    id: newGiftId(),
    title: title.trim(),
    occasion: occasion.trim(),
    notes: options.notes?.trim() ?? null,
    liked: options.liked ?? false,
    givenAt: options.givenAt ?? null,
    createdAt: new Date(),
  };
}

// Reconstitute from persistence (no business rules applied)
export function reconstituteGift(
  id: string,
  title: string,
  occasion: string,
  notes: string | null,
  liked: boolean,
  givenAt: Date | null,
  createdAt: Date,
): Gift {
  return { id: giftIdFrom(id), title, occasion, notes, liked, givenAt, createdAt };
}
