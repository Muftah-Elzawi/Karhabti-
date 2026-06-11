# Karhabti — Master Build Prompt for Claude Code

> **How to use this file:** Place it at the root of your repo. In Claude Code, start with
> "Read KARHABTI_BUILD_PROMPT.md and CLAUDE.md, then let's begin Phase 1, Step 1." Build **one
> phase at a time, one module at a time.** Never ask Claude Code to "build the whole app" in one
> go. Review every step before moving on. Run tests after each module.

---

## 0. What we are building

**Karhabti / كرهبتي** ("my car" in Libyan slang) is a mobile-first car-care super-app for the
Libyan market. One app, multiple product lines:

- **Services** — mobile car wash at launch; later oil change, mechanic, towing
- **Parts** — spare parts and accessories, browse and order
- **Car-care companion** — each user's real car has a live health dashboard, personalized
  maintenance reminders, and tips specific to their make/model/year and the Libyan climate

The companion layer is what makes the app sticky: users open it to "check on their car," not just
to transact. The transactional loop (book/buy/pay) must work first; the engagement layer is built
on top in a later phase.

**Primary market:** Libya (launch city: Tripoli). **Primary language:** Arabic (RTL). Secondary:
English (LTR). **Default currency:** Libyan Dinar (LYD).

---

## 1. Non-negotiable principles

1. **One API, many clients.** All business logic lives in the backend API. Web, mobile, and admin
   are thin clients that call the same endpoints. Never put business rules in a client.
2. **Arabic-first, RTL by default.** Every screen must work correctly in RTL from the first line of
   code. Never bolt RTL on later. Test every component with `dir="rtl"`.
3. **Clean architecture.** Backend separates domain / application / infrastructure / presentation.
   No database calls in controllers. No framework imports in domain entities.
4. **Type safety end to end.** TypeScript everywhere, strict mode. Shared types between API and
   clients via a shared package. Validation with Zod, shared where possible.
5. **Honesty in the companion layer.** Maintenance reminders, health scores, and tips must be
   genuinely accurate and useful. No fake busywork gamification. The car data model must support
   real, car-specific, climate-aware information.
6. **Mobile-first.** Design for a phone screen first, scale up to desktop second.
7. **Production-grade from day one.** Error handling, structured logging, input validation, rate
   limiting, and tests are part of every module — not a later cleanup phase.
8. **Build incrementally.** Every phase ends in something that runs and is reviewable. No giant
   untested code dumps.

---

## 2. Tech stack (do not substitute without asking)

| Layer | Choice |
|---|---|
| Monorepo tooling | pnpm workspaces + Turborepo |
| Language | TypeScript (strict) everywhere |
| Backend | NestJS 10 |
| ORM | Prisma |
| Database | PostgreSQL |
| Cache / queues | Redis + BullMQ |
| Web frontend | Next.js 14 (App Router), PWA-enabled |
| Mobile frontend | React Native + Expo (added in a later phase) |
| Shared UI | Tamagui (works web + native) |
| Admin UI | Next.js + shadcn/ui (web-only, internal) |
| State (clients) | TanStack Query + Zustand |
| Validation | Zod (shared) |
| Auth | JWT (access + refresh); NextAuth on web, Expo SecureStore on mobile |
| Payments | Plutu REST API (COD + Sadad + Adfali at launch) |
| File storage | Cloudflare R2 (S3-compatible) |
| SMS / OTP | Twilio or a Libyan SMS gateway (abstract behind an interface) |
| Push notifications | Firebase Cloud Messaging (later phase) |
| Real-time | Socket.IO |
| Error tracking | Sentry |
| Logging | Pino (structured JSON) |
| Testing | Jest (unit/integration) + Playwright (E2E) |
| API docs | OpenAPI via @nestjs/swagger |
| Containerization | Docker + docker-compose |
| CI/CD | GitHub Actions |
| Dev environment | GitHub Codespaces (browser-based) |

---

## 3. Monorepo structure

```
karhabti/
├── apps/                  # each app is INDEPENDENTLY runnable + deployable
│   ├── api/            # NestJS backend — standalone (own Dockerfile, .env, deploy)
│   ├── web/            # Next.js customer web app (PWA) — standalone deploy
│   ├── admin/          # Next.js admin dashboard (internal) — standalone deploy
│   └── mobile/         # React Native (Expo) — added in a later phase
├── packages/              # shared CONTRACTS only — never app business logic
│   ├── database/       # Prisma schema, migrations, generated client (used by api only)
│   ├── types/          # Shared TypeScript types/contracts across apps — no logic
│   ├── validation/     # Shared Zod schemas
│   ├── api-client/     # type-safe client GENERATED from the API's OpenAPI spec
│   ├── ui/             # Shared Tamagui components (web + mobile)
│   ├── i18n/           # Arabic + English translation files
│   └── config/         # Shared ESLint (incl. boundary rules), TSConfig, Tamagui config
├── docker-compose.yml     # local dev: Postgres + Redis (+ optionally each app)
├── pnpm-workspace.yaml
├── turbo.json             # task graph + enforced dependency boundaries
├── CLAUDE.md
└── KARHABTI_BUILD_PROMPT.md   # this file
```

---

## 3a. Monorepo boundaries & standalone-runnability (foundation rules)

The monorepo is colocation for convenience, NOT coupling. These rules are non-negotiable and must
be enforced by tooling (lint/build), not goodwill. A forbidden import must FAIL CI.

**Standalone-runnable & independently deployable.** Every app under `apps/` has its own
`package.json`, its own env config (`.env` + `.env.example`), its own build command, and its own
Dockerfile / deploy config. The API must run with zero knowledge of any frontend
(`cd apps/api && docker build .` works in isolation). The web and admin apps deploy separately
(Vercel project or VPS container each). No app depends on another app's running state at build time.

**One-directional dependency rule.** Dependencies flow ONE way only:

```
apps/*  ──→  packages/*          (allowed)
packages/*  ──→  apps/*          (FORBIDDEN — fails build)
apps/*  ──→  apps/*              (FORBIDDEN — fails build)
packages/* ──→ packages/* below it in the graph (allowed, acyclic only)
```

**Apps never import each other's internals.** `apps/web` talks to `apps/api` only over HTTP, via
the generated `packages/api-client` and shared `packages/types`. It must NEVER import from
`apps/api/src/**`. The API's internal layers (domain/application/infrastructure) are invisible
outside the API.

**Shared packages hold contracts, not app logic.** `packages/types` defines the SHAPE of a
`Booking`; the RULES for creating a booking live inside `apps/api` and never leak out. If logic
belongs to one app, it stays in that app.

**The cross-app contract is generated, not hand-synced.** The API emits an OpenAPI spec;
`packages/api-client` is generated from it and consumed by web/mobile. Changing the API surface
regenerates the client, and TypeScript immediately flags every broken call site. Never hand-write
duplicate types on the client side.

**Clean architecture at two levels.** Macro: the dependency rules above, between apps/packages.
Micro: inside the API, the domain/application/infrastructure/presentation layering. Both must hold;
a clean macro structure with muddy API internals (or vice versa) is a failure.

**Enforcement.** Configure ESLint import-boundary rules (e.g. `eslint-plugin-boundaries` or
`import/no-restricted-paths`) plus Turborepo's dependency graph so violations fail `pnpm lint` and
CI. The architecture is enforced by the machine.

---

## 4. Brand & design direction

**Name:** Karhabti / كرهبتي (this exact Latin spelling everywhere).

**Palette (use as design tokens):**

- Libyan red `#C8102E` — primary actions, brand
- Charcoal `#1A1A1A` — text, dark surfaces
- Sand amber `#E8A33D` — accents, highlights, indicators
- Warm white `#FAF7F2` — backgrounds (never pure white)
- Olive green `#5C7A2A` — success states, "in stock"/"available" badges

**Design feel:** Warm, trustworthy, confident, Libyan-rooted, modern but not cold. Mobile-first.
The car-care companion screens should feel alive and satisfying to check — think Apple Fitness
rings, not a spreadsheet. Browsing parts should feel like scrolling a clean feed, not a hardware
catalog.

**Typography:** Arabic — a modern humanist face (e.g. IBM Plex Sans Arabic, Cairo, or Tajawal).
Latin — a clean sans with character (e.g. Inter, Manrope, or Plus Jakarta Sans). Pick a pairing
and define a clear type scale. Sentence case everywhere. Two weights (regular + medium).

**Motion:** Deliberate, not scattered. The car-health ring filling up, a satisfying confirmation
when a booking completes, a gentle celebration on a milestone. Respect reduced-motion settings.

**Copy:** Plain, active voice, written from the customer's side of the screen. Arabic copy must be
reviewed by a native Libyan speaker (the operations partner) — placeholders are fine during build,
flag them clearly as `// TODO: review Arabic copy`.

---

## 5. Data model (Prisma) — services, parts, AND companion from day one

Design the full schema up front, even for tables used only in later phases. Core entities:

**Identity & profile**

- `User` — id, phone (primary identifier in Libya), email (optional), passwordHash, displayName,
  role (CUSTOMER | PROVIDER | ADMIN), locale (ar | en), isPhoneVerified, createdAt, updatedAt
- `Address` — userId, label, governorate, city, area, details, lat/lng (optional), isDefault
- `RefreshToken`, `OtpCode` — auth support tables

**The car (companion core)**

- `Vehicle` — userId, makeId, modelId, year, engine (optional), nickname, plateNumber (optional),
  mileageKm, color, photoUrl, createdAt
- `VehicleMake` / `VehicleModel` — hierarchical, slugged; seed with top Libyan-market brands
  (Toyota, Hyundai, Kia, Nissan, Mitsubishi) and their common models
- `MaintenanceItem` — catalog of maintenance types (oil change, tire rotation, brake check, air
  filter, etc.) with default intervals (km + months)
- `VehicleMaintenanceRecord` — vehicleId, maintenanceItemId, performedAt, mileageAtService,
  source (SELF_REPORTED | KARHABTI_SERVICE), nextDueKm, nextDueDate, notes
- `CareTip` — make/model/year-targeted (and climate-targeted) tips; title, body (ar/en), category,
  conditions (e.g. summer-heat, dusty-season)

**Services**

- `ServiceCategory` — car wash, oil change, etc. (nameAr, nameEn, slug, icon)
- `Service` — categoryId, nameAr/nameEn, descriptionAr/En, basePriceLYD, durationMinutes, isActive
- `ServiceProvider` — userId, businessName, governorate, serviceAreas, rating, isVerified, status
- `ServiceBooking` — customerId, providerId (nullable until assigned), serviceId, vehicleId,
  addressId, scheduledFor, status (PENDING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED),
  priceLYD, paymentId, notes, timestamps for each status transition
- `Review` — bookingId, customerId, rating (1–5), body, createdAt

**Parts**

- `ProductCategory` — self-referencing for subcategories; nameAr/En, slug, icon
- `Product` — sellerId (nullable in reseller model), categoryId, nameAr/En, descriptionAr/En,
  oemCode, aftermarketCode, brand, condition (NEW | USED | REFURBISHED), priceLYD, stock, status
  (DRAFT | ACTIVE | PAUSED | REMOVED), images (Json ordered array), warrantyMonths, weightKg
- `ProductFitment` — many-to-many Product ↔ Vehicle (make/model/year/engine) for "fits your car"
- `Cart` / `CartItem` — userId or sessionId based; merge guest cart on login
- `ProductOrder` — buyerId, status (PENDING | CONFIRMED | SHIPPED | DELIVERED | CANCELLED |
  RETURNED), items, shippingAddress (Json snapshot), totalLYD, paymentId, timestamps
- `OrderItem` — orderId, productId, quantity, unitPriceLYD, productSnapshot (Json)
- `LeadRequest` — for Phase 4 WhatsApp lead-gen: productId, userId, vehicleId, status, channel,
  trackingCode, createdAt
- `Return` — orderId, reason, status, resolution, timestamps

**Payments**

- `Payment` — amountLYD, method (COD | SADAD | ADFALI | CARD), provider (PLUTU | CASH),
  status (INITIATED | PENDING | SUCCESS | FAILED | REFUNDED), plutuRef, rawPayload (Json),
  relatedType (BOOKING | ORDER), relatedId, timestamps

**Engagement**

- `CareScore` — vehicleId, score (0–100), computedAt, breakdown (Json)
- `PointsLedger` — userId, delta, reason, relatedType, relatedId, balanceAfter, createdAt
- `Milestone` — userId, type, achievedAt, isShared
- `Notification` — userId, type, titleAr/En, bodyAr/En, isRead, deepLink, createdAt

**Cross-cutting**

- `AuditLog` — actorId, action, entityType, entityId, before (Json), after (Json), createdAt

Generate the schema, then migrations, then a seed script with realistic Libyan test data:
Tripoli + Benghazi addresses, Toyota Corolla / Hyundai Accent / Kia Rio vehicles, a few services,
a handful of products with real OEM-style codes, and sample maintenance records.

---

## 6. API conventions

- Versioned routes: `/api/v1/...`
- Consistent response envelope: `{ "data": ..., "meta": ..., "error": ... }`
- Cursor-based pagination on list endpoints; standardized filter/sort query params
- `Accept-Language` header drives ar/en content in responses
- All input validated with Zod; reject invalid input with structured errors
- Rate limit auth/OTP endpoints (e.g. 5 attempts / 15 min per IP + per phone)
- JWT access tokens (short-lived) + refresh tokens (rotated)
- Every state-changing action writes to `AuditLog`
- OpenAPI spec auto-generated and served at `/api/docs`
- Webhooks (Plutu) verified by signature before processing

---

## 7. Build phases

Build in this order. Each phase has a Definition of Done. Do not start the next phase until the
current one is met. Within a phase, build module by module and review each.

### Phase 1 — Foundation (no business features yet)

1. Bootstrap pnpm-workspaces + Turborepo with all apps/packages skeletons; TS strict;
   ESLint/Prettier/Husky. Configure import-boundary lint rules (section 3a) so forbidden imports
   fail CI from day one. Each app gets its own `package.json`, `.env.example`, and Dockerfile so it
   is standalone-runnable and independently deployable.
2. `CLAUDE.md` with conventions; `docker-compose.yml` for Postgres + Redis; first GitHub Action
   (lint + typecheck + boundary check).
3. Prisma schema (full, from section 5) + first migration + seed script.
4. NestJS skeleton with clean-architecture folders; global error handler; Pino logging; Sentry;
   OpenAPI; health-check endpoint.
5. Auth module: phone-based register/login, OTP verification, JWT access+refresh, RBAC guards.
6. Next.js web skeleton: Arabic RTL default, i18n (ar/en), Tamagui design tokens from section 4,
   PWA manifest + service worker, auth screens (login / register / OTP).
7. Deploy API to staging (Docker on VPS) and web to staging; verify end-to-end.

**Definition of Done:** a user can register, verify phone via OTP, log in, view profile, log out;
staging is live; OpenAPI served; CI green; the API runs standalone in its own container; forbidden
cross-app/cross-package imports fail CI.

### Phase 2 — Car wash MVP (transactional core)

1. Service + ServiceProvider + Service catalog modules (backend).
2. Vehicle module: add/edit a car (make→model→year), set as default — this is also the companion
   foundation.
3. Address module: saved addresses with Libyan governorate/city selectors.
4. Booking module: create booking, booking state machine, manual provider assignment (admin),
   SMS/in-app notifications on status change.
5. Web UI: browse services, booking flow (service → vehicle → address → time → confirm),
   "my bookings" list + booking detail with status timeline.
6. Provider portal (web): login, "my jobs," accept/decline, mark in-progress/completed.
7. Admin (shadcn/ui): manage providers, assign bookings, override status, view audit log.
8. Plutu integration (sandbox): COD + Sadad + Adfali; init → redirect/OTP → webhook → confirm;
   refund (admin). Payment state machine.

**Definition of Done:** end-to-end car wash booking with sandbox payment works for all 3 methods;
provider can fulfill; admin can intervene; reviews can be left on completed bookings.

### Phase 3 — Production launch prep (services)

1. Production infra: hardened VPS, DB backups, HTTPS, Cloudflare, production Sentry, rate limiting.
2. Privacy policy + terms (ar/en).
3. Production Plutu (real merchant account) — gate launch on approval; fall back to COD-only if
   delayed.
4. Polish the booking + provider flows based on internal testing.

**Definition of Done:** the services side is production-ready and could take a real paying customer
in Tripoli today.

### Phase 4 — Parts catalog (read-only) + lead-gen

1. Product + ProductCategory + ProductFitment modules; image upload to R2; bulk CSV import (admin).
2. Parts browse UI: category browse, full-text search (Arabic + English), filters (category,
   brand, price, condition), product detail with images + fitment + OEM code.
3. "Fits your car" — filter products by the user's saved vehicle.
4. LeadRequest flow: "Request this part" → pre-filled WhatsApp message with tracking code; admin
   sees and tracks leads.

**Definition of Done:** 100+ products browseable with accurate fitment; search/filter work; lead
requests captured and trackable. (No checkout yet — that's Phase 6.)

### Phase 5 — Car-care companion + engagement layer

This is the "make it desirable to open daily" phase. Build on the real Vehicle data.

1. **My Garage** screen: visual card per car with a live **car-health ring** (oil, tires, brakes,
   registration, insurance) computed from `VehicleMaintenanceRecord` intervals and current mileage.
2. **Next-service countdowns**: "Oil change due in 850 km or 24 days," accurate per vehicle.
3. **Personalized tips feed**: `CareTip` entries targeted by make/model/year + Libyan climate
   conditions (summer heat, dusty season). Genuinely useful, accurate content.
4. **Care Score** (0–100) per vehicle, rising with on-time/completed maintenance, with an honest
   breakdown. Never fake.
5. **Karhabti Points** (`PointsLedger`): earned on completed bookings/orders, redeemable for real
   discounts. Ties engagement to revenue.
6. **Milestones**: "1 year caring for your car," "10 services completed" — emotional, shareable.
7. **Delight layer**: smooth micro-interactions, satisfying ring-fill animation, gentle
   celebration on milestones, beautiful feed-style browsing. Respect reduced-motion.
8. **Smart reminders** (BullMQ jobs): push/SMS/in-app when a service is due — which naturally
   drives bookings.

**Definition of Done:** a user with a saved car sees an accurate, attractive health dashboard,
gets correct due-date reminders, receives real car-specific tips, and earns points that convert to
real discounts. The screen is something they'd open without being told to.

### Phase 6 — Parts checkout + React Native mobile

1. Cart + checkout (web): address, payment method, confirm; Plutu for products; COD option; stock
   decrement; order tracking; returns flow.
2. React Native (Expo) app added to monorepo; Tamagui shared components; auth (SecureStore);
   service booking + parts browsing + My Garage parity; push notifications (FCM); real-time status
   via Socket.IO.
3. Submit to Google Play (Android first) and Apple App Store.

**Definition of Done:** parts checkout works end-to-end on web + mobile; Android app live; the
companion + transactional experience is fully usable on a phone.

---

## 8. Testing & quality gates

- Unit tests for every use-case/service class.
- Integration tests for auth, booking, payment, and checkout flows.
- At least one Playwright E2E per major journey (register→book→pay; browse→lead; browse→buy→pay).
- Run tests after every module; never merge red.
- Each module ships with input validation, error handling, structured logs, and audit entries.

---

## 9. What to ask me before coding

Before starting Phase 1, confirm with me:

- Exact Plutu sandbox credentials and the current Plutu REST endpoints/methods.
- SMS provider choice (Twilio vs a Libyan gateway) and credentials.
- Final typography pairing (Arabic + Latin faces).
- The list of Libyan governorates/cities to seed for addresses and service areas.

If anything in this document is ambiguous when you reach it, stop and ask rather than guessing.

---

## 10. First action

Start by reading this file and `CLAUDE.md`. Then propose the Phase 1, Step 1 monorepo skeleton
(folder tree + key config files) and wait for my approval before generating it. Build one step at
a time, and after each step, summarize what you did and what the next step is.
