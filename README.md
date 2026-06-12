# Karhabti / كرهبتي

A mobile-first car-care super-app for Libya: services (car wash first), spare parts, and a
car-care companion layer. Arabic-first, RTL by default. Currency: LYD.

See [`KARHABTI_BUILD_PROMPT.md`](./KARHABTI_BUILD_PROMPT.md) for the full spec and phase plan,
[`CLAUDE.md`](./CLAUDE.md) for the working conventions, and [`brand/`](./brand/) for the
"Diagnose Drive" identity assets.

## Build status

| Phase                                                 | Status                                   |
| ----------------------------------------------------- | ---------------------------------------- |
| 1 — Foundation (monorepo, schema, auth, web skeleton) | ✅ done (staging deploy deferred)        |
| 2 — Car wash MVP                                      | 🔨 steps 1–5 done (backend + booking UI) |
| 2.6 Provider portal · 2.7 Admin dashboard · 2.8 Plutu | ⬜ next                                  |

## Monorepo layout

| Path         | What it is                                                                           |
| ------------ | ------------------------------------------------------------------------------------ |
| `apps/api`   | NestJS backend — the one API all clients talk to (`/api/v1`, OpenAPI at `/api/docs`) |
| `apps/web`   | Next.js customer web app (PWA)                                                       |
| `apps/admin` | Next.js admin dashboard (internal, skeleton only so far)                             |
| `packages/*` | Shared contracts only: types, Zod schemas, i18n, generated api-client, UI, config    |
| `deploy/`    | Single-VPS staging kit (Caddy + compose) — ready for when a server exists            |

Every app is standalone-runnable and independently deployable. Dependency direction is one-way
(`apps/* → packages/*`) and enforced by ESLint boundary rules that fail CI.

## Prerequisites

- **Node.js 20+** (Node 25 works; note `next dev` needs ≥22 — see troubleshooting)
- **pnpm 10** — `npm install -g pnpm@10` (Node 25 no longer bundles corepack)
- **Docker Desktop** (Postgres + Redis run in containers)

## First-time setup

```powershell
pnpm install

# env files (defaults work out of the box)
copy packages\database\.env.example packages\database\.env
copy apps\api\.env.example apps\api\.env

docker compose up -d                              # Postgres :5432 + Redis :6379
pnpm --filter @karhabti/database db:deploy        # apply migrations
pnpm --filter @karhabti/database db:generate      # generate the Prisma client
pnpm --filter @karhabti/database db:seed          # Libyan demo data (makes, services, …)
pnpm --filter @karhabti/validation build          # shared schemas used at runtime
```

> **Port conflict?** If something already uses 5432 (e.g. a native PostgreSQL install), create a
> gitignored `docker-compose.override.yml` mapping another port (e.g. `'5440:5432'`) and change
> the port inside both `.env` files to match.

## Running the app (every day)

Three terminals (or run them hidden — they just need to stay up):

```powershell
docker compose up -d                       # 1. infrastructure (if not already running)
pnpm --filter @karhabti/api dev            # 2. API on http://localhost:3001 (hot reload)
pnpm --filter @karhabti/web dev            # 3. web on http://localhost:3000 (hot reload)
```

- Web app: **http://localhost:3000**
- API docs (Swagger): **http://localhost:3001/api/docs**
- Health check: **http://localhost:3001/api/v1/health**

## Testing guide

### 1. Register an account (no real SMS needed)

There is **no real SMS provider yet** — OTP codes are printed to the API terminal instead of
being sent. Any number matching the Libyan mobile format works (`091`–`095` + 7 digits, e.g.
`0911111111`); it's just an identifier.

1. Open http://localhost:3000 → **إنشاء حساب** (register)
2. When the OTP screen appears, read the 6-digit code from the API terminal — it's inside an
   Arabic SMS line. If the terminal scrambles the RTL text, extract just the code:

   ```powershell
   # if the API runs in a visible terminal, the code is in the "SMS (console driver)" line.
   # if it was started with output redirected to %TEMP%\karhabti-api-dev.log:
   ([regex]::Matches((Get-Content "$env:TEMP\karhabti-api-dev.log" -Raw), '(?<!\d)(\d{6})(?!\d)') | Select-Object -Last 1).Value
   ```

3. Enter the code → you're verified and signed in. Login works with **phone or email** +
   password (add an email on `PATCH /auth/me` via Swagger, or it can be set by an admin).

### 2. What to click through (customer journey)

From the home page after logging in:

- **الخدمات** — browse services, filter by category chips
- **احجز الآن** on any service — the 4-step wizard: car → address → time → confirm.
  First time? The wizard lets you add a car (make → model → year) and an address inline.
- **حجوزاتي** — your bookings with status badges; open one for the live status timeline,
  cancellation (while pending/confirmed), and the 5-star review form (once completed).
- Switch the whole app to English with the language toggle on the home page.

### 3. Play the other roles (admin + provider)

A booking moves `PENDING → CONFIRMED → IN_PROGRESS → COMPLETED` through an admin and a provider.
Until their dashboards are built (phase 2.6/2.7), drive them from Swagger:

**Make yourself admin** (one-time, by design there is no API for this):

```powershell
docker exec karhabti--postgres-1 psql -U karhabti -d karhabti -c "UPDATE public.\"User\" SET role='ADMIN' WHERE phone='09XXXXXXXX';"
```

Log out and back in, then in Swagger (http://localhost:3001/api/docs):

1. `POST /auth/login` → copy `accessToken` → click **Authorize**, paste it
2. **Onboard a provider**: register a second account in the browser first, then
   `POST /admin/providers` with its phone + business name + governorate, and
   `PATCH /admin/providers/{id}` with `{"status":"ACTIVE","isVerified":true}`
3. **Assign a booking**: `GET /admin/bookings` → `POST /admin/bookings/{id}/assign`
4. Log in to Swagger as the provider account, then:
   `POST /provider/bookings/{id}/accept` → `/start` → `/complete`
5. Back in the browser as the customer: watch the timeline update, leave a review.

Every state change writes an `AuditLog` row — inspect them with:

```powershell
docker exec karhabti--postgres-1 psql -U karhabti -d karhabti -c "SELECT action, \"entityType\", \"createdAt\" FROM public.\"AuditLog\" ORDER BY \"createdAt\" DESC LIMIT 20;"
```

## Useful commands

| Command                                       | What it does                                |
| --------------------------------------------- | ------------------------------------------- |
| `pnpm build` / `pnpm lint` / `pnpm typecheck` | Turborepo across the whole workspace        |
| `pnpm test`                                   | All unit tests (101+ on the API)            |
| `pnpm --filter @karhabti/database db:studio`  | Prisma Studio — browse the database in a UI |
| `pnpm --filter @karhabti/database db:seed`    | Re-seed (idempotent, safe to repeat)        |
| `pnpm icons`                                  | Regenerate PWA icons from `brand/` SVGs     |

## Troubleshooting

- **`next dev` crashes on Node 25** (`Cannot find module 'next/dist/pages/_app'`) — known
  Next 14 / Node 25 incompatibility. Use Node 22 LTS for dev, or `next build && next start`.
- **Stop all running apps before `pnpm install` or `db:generate`** — a running API locks the
  argon2/Prisma native binaries on Windows and corrupts the install (`EPERM` errors). Fix:
  kill all node processes, `pnpm install --force`.
- **Never delete `.next` with `Remove-Item -Recurse`** — use `cmd /c rmdir /s /q .next`
  (PowerShell 5.1 follows symlinks while deleting).
- **Cookies in production builds**: `next start` marks session cookies `Secure`. For plain-HTTP
  smoke tests set `COOKIE_SECURE=false` (never on a deployed environment).

## Deployment

Local-only for now (by choice). When a VPS + domain exist, follow
[`deploy/README.md`](./deploy/README.md) — Caddy auto-HTTPS + API + web + Postgres + Redis on a
single box, roughly a 15-minute job.
