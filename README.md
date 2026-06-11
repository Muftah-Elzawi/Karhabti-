# Karhabti / كرهبتي

A mobile-first car-care super-app for Libya: services (car wash first), spare parts, and a
car-care companion layer. Arabic-first, RTL by default. Currency: LYD.

See [`KARHABTI_BUILD_PROMPT.md`](./KARHABTI_BUILD_PROMPT.md) for the full spec and phase plan, and
[`CLAUDE.md`](./CLAUDE.md) for the working conventions.

## Monorepo layout

| Path         | What it is                                                                        |
| ------------ | --------------------------------------------------------------------------------- |
| `apps/api`   | NestJS backend — the one API all clients talk to                                  |
| `apps/web`   | Next.js customer web app (PWA)                                                    |
| `apps/admin` | Next.js admin dashboard (internal)                                                |
| `packages/*` | Shared contracts only: types, Zod schemas, i18n, generated api-client, UI, config |

Every app is standalone-runnable and independently deployable. Dependency direction is one-way
(`apps/* → packages/*`) and enforced by ESLint boundary rules that fail CI.

## Getting started

```bash
corepack enable                 # provides pnpm (see "packageManager" in package.json)
pnpm install
docker compose up -d            # Postgres + Redis
pnpm dev                        # all apps, or: pnpm --filter @karhabti/web dev
```

| Command          | What it does                           |
| ---------------- | -------------------------------------- |
| `pnpm build`     | Build all apps (Turborepo)             |
| `pnpm lint`      | ESLint incl. monorepo boundary check   |
| `pnpm typecheck` | TypeScript strict across the workspace |
| `pnpm test`      | Run all tests                          |

Local ports: web `3000`, API `3001`, admin `3002`. Copy each app's `.env.example` before running it.
