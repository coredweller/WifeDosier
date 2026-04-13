// ── AppError discriminated union — exhaustive, pattern-matchable ───────────
export type AppError =
  | { readonly kind: 'NotFound'; readonly id: string }
  | { readonly kind: 'ValidationError'; readonly message: string }
  | { readonly kind: 'Conflict'; readonly message: string };

// ── Result<T> — makes error states explicit in function signatures ──────────
export type Result<T, E = AppError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function fail<E extends AppError>(error: E): Result<never, E> {
  return { ok: false, error };
}
