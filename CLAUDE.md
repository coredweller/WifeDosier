# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with hot reload (tsx watch)
npm run build        # Compile to dist/
npm run typecheck    # Type-check without emitting
npm run lint         # ESLint
npm test             # Run all tests (vitest)
npm run test:watch   # Watch mode
npm run test:coverage

# Run a single test file
npx vitest run test/unit/gift.service.test.ts

# Database
npm run db:generate  # Generate migration from schema changes
npm run db:migrate   # Apply migrations
npm run db:studio    # Open Drizzle Studio
```

Environment variables required: `DATABASE_URL`. See `src/config.ts` for the full Zod-validated schema — never read `process.env` directly, always import `config`.

## Architecture

Strict layered architecture: **Routes → Service → Repository → Domain**. Each layer only imports inward.

```
src/
  config.ts               # Zod-parsed env vars (throws at startup if invalid)
  db.ts                   # postgres-js + Drizzle client
  domain/
    errors.ts             # AppError discriminated union + Result<T>
    gift.ts               # Domain types, branded GiftId, factories
  routes/gifts.ts         # Fastify plugin: Zod schemas, HTTP → domain mapping
  services/               # GiftService + IGiftService interface
  repositories/           # DrizzleGiftRepository + IGiftRepository interface
  schema/gifts.schema.ts  # Drizzle table definition (source of truth for DB shape)
```

### Key Patterns

**Result<T>** — all service methods return `Result<T, AppError>` (never throw to callers). Use `ok(value)` / `fail(error)` from `domain/errors.ts`. Routes check `result.ok` and map `AppError.kind` to HTTP status via the `statusFor` switch.

**Zod at the HTTP boundary only** — `CreateGiftSchema` in `routes/gifts.ts` validates and coerces `givenAt` from string to Date. Domain types carry native `Date` values.

**Dependency injection via `buildApp(deps)`** — `main.ts` exports `buildApp({ service? })`. Integration tests pass a stub service without `vi.mock()`, keeping tests fast and isolated. Migrations are skipped when `NODE_ENV === 'test'`.

**Branded types** — `GiftId = string & { _brand: 'GiftId' }`. Use `giftIdFrom(str)` to cast from raw strings and `newGiftId()` to create new ones.

### Gift Domain

| Field | Type | Notes |
|-------|------|-------|
| id | GiftId | UUID, branded |
| title | string | What the gift is |
| occasion | string | Birthday, Anniversary, Christmas, etc. |
| notes | string \| null | Optional extra details |
| liked | boolean \| null | Did she like it? null = unknown |
| givenAt | Date | When it was given |
| createdAt | Date | DB record creation time |

### TypeScript Config

Strict mode plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`. All imports use `.js` extensions (NodeNext module resolution). Tests are excluded from the main `tsconfig.json`; see `tsconfig.test.json`.

## Tests

Integration tests live in `test/integration/`, unit tests in `test/unit/`. The vitest config runs in `node` environment — tests do not hit a real DB (service is stubbed at the route layer via `buildApp({ service })`).

Always write tests for new routes and domain logic. Follow the existing `it.each` pattern for boundary value coverage.
