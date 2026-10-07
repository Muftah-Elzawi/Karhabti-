# CLAUDE.md — Karhabti project instructions

Claude Code reads this file at the start of every session. It defines how to work in this repo.
The full product spec and phased plan live in `KARHABTI_BUILD_PROMPT.md` — read that too.

## Project

Karhabti / كرهبتي ("my car" in Libyan slang): a mobile-first car-care super-app for Libya.
Services (car wash first) + parts + a car-care companion layer. Arabic-first, RTL. Currency LYD.

## Stack

Turborepo monorepo (pnpm workspaces + Turborepo). TypeScript strict everywhere.

- Backend: NestJS 10, Prisma, PostgreSQL, Redis + BullMQ
- Web: Next.js 14 (App Router, PWA), Tamagui
- Admin: Next.js + shadcn/ui (web-only)
- Mobile: React Native + Expo (later phase), Tamagui
- Clients: TanStack Query + Zustand, Zod validation
- Payments: Plutu REST (COD + Sadad + Adfali)
- Storage: Cloudflare R2. SMS: provider behind an interface. Push: FCM (later).
- Real-time: Socket.IO. Errors: Sentry. Logs: Pino. Tests: Jest + Playwright.

## Architecture rules

- One API, many clients. All business logic in the backend. Clients are thin.
- Backend clean architecture: domain / application / infrastructure / presentation.
- Domain entities import no framework code. Controllers contain no business logic and no Prisma.
- Repositories are the only place that touch Prisma.
- All input validated with Zod. All responses use the envelope `{ data, meta, error }`.
- Versioned API routes under `/api/v1`.
- Every state-changing action writes an `AuditLog` entry.
- Verify webhook signatures (Plutu) before processing.

## Monorepo boundary rules (macro-level clean architecture)

- The monorepo is colocation, NOT coupling. Boundaries are enforced by lint/CI, not goodwill.
- Every app under `apps/` is standalone-runnable and independently deployable: own package.json,
  own .env, own Dockerfile/deploy. The API must build and run with zero knowledge of any frontend.
- Dependency direction is one-way only: `apps/* → packages/*`. NEVER `packages/* → apps/*`, NEVER
  `apps/* → apps/*`. A forbidden import must fail CI.
- Apps never import another app's internals. `web`/`admin`/`mobile` talk to `api` only over HTTP,
  via `packages/api-client` (generated from the API's OpenAPI spec) and `packages/types`.
- Shared packages hold contracts (types, schemas), not app business logic. Logic that belongs to
  one app stays in that app.
- The cross-app type contract is GENERATED from the API's OpenAPI spec, never hand-synced.

## RTL & i18n rules

- Arabic (ar) is the default locale and RTL is the default direction.
- Every component must work correctly under `dir="rtl"` — test it from the start.
- Never hardcode user-facing strings. Use i18n keys in `packages/i18n` (ar + en).
- Placeholder Arabic copy is allowed during build but must be marked `// TODO: review Arabic copy`.

## Companion-layer honesty rule

- Maintenance reminders, due-dates, health scores, and tips must be accurate and genuinely useful.
- Never invent fake engagement (no points for merely opening the app). Points tie to real actions
  (completed bookings/orders) and convert to real discounts.

## Conventions

- Files: kebab-case. Classes/types: PascalCase. Variables/functions: camelCase.
- Imports: absolute via configured path aliases (e.g. `@/`), not deep relative paths.
- Tests co-located as `*.spec.ts`. Run tests after every module; never leave tests red.
- Commits: conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`).
- Money: store and compute in LYD using Prisma `Decimal`; never floats for currency.
- Dates/intervals: store mileage in km and time in days/months explicitly.

## Never do

- Never commit secrets. Use `.env` (and `.env.example` with placeholder keys).
- Never query Prisma from a controller — go through a repository.
- Never hardcode `ar`/`en` strings in components — use i18n keys.
- Never skip input validation on an endpoint.
- Never use `localStorage`/`sessionStorage` assumptions in shared logic — clients differ (web vs
  native); use the platform-appropriate secure storage abstraction.
- Never build the whole app in one step. One phase, one module, reviewed, tested, then next.

## Working rhythm

- Read `KARHABTI_BUILD_PROMPT.md` for the phase plan. Build the current phase only.
- For each step: propose the plan briefly, get approval, implement, run tests, summarize, and state
  the next step. If anything is ambiguous, stop and ask rather than guessing.
