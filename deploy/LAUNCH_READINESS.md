# Karhabti — launch readiness checklist

The goal of this file: the **technical side is ready in code**, and everything that
still blocks a real production launch is listed here explicitly so it can't
surprise us later. Nothing below is a code bug — it's external setup (budget,
accounts, approvals, DNS) that has to happen on the day we go live.

Legend: ✅ done in code · 🟡 partly done / needs config · ⛔ blocked on
budget/approval/external action · 📝 needs a human (legal/content)

Last reviewed: 2026-06 (end of Phase 2; Phase 3 code-doable slice).

---

## 1. Hosting & infrastructure ⛔ (budget)

| Item                                          | State                         | What's needed to go live                                            |
| --------------------------------------------- | ----------------------------- | ------------------------------------------------------------------- |
| Deploy kit (Docker Compose + Caddy + migrate) | ✅ `deploy/`                  | —                                                                   |
| VPS provisioned (2 GB+ RAM, Docker)           | ⛔                            | Rent a VPS; install Docker Engine + Compose plugin                  |
| Domain + DNS A records                        | ⛔                            | Buy domain; point `@`/`api` (and `admin`) at the VPS IP             |
| HTTPS / TLS                                   | ✅ (Caddy auto Let's Encrypt) | Just needs the domain + ports 80/443 open                           |
| Firewall                                      | 🟡 (documented below)         | `ufw` allow 22/80/443 only; deny Postgres/Redis from outside        |
| Admin app deployed                            | 🟡                            | Add an `admin` service to compose + `admin.<domain>` (mirror `web`) |

The single-VPS plan and first-deploy steps live in [README.md](README.md). Postgres
and Redis already have **no host-exposed ports** in the compose file (only reachable
on the internal Docker network) — good. Production deltas (backups, headers,
Cloudflare) are covered below.

### Firewall (run once on the VPS)

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP (Caddy ACME + redirect)
ufw allow 443/tcp     # HTTPS
ufw enable
```

## 2. Database backups 🟡 → ✅ (scripts ready; schedule on the box)

- Backup + restore scripts: ✅ [`scripts/backup-db.sh`](scripts/backup-db.sh),
  [`scripts/restore-db.sh`](scripts/restore-db.sh).
- To activate on the VPS, add a cron entry (daily 02:30, keeps 14 days):

  ```bash
  crontab -e
  30 2 * * * cd /home/deploy/karhabti && BACKUP_DIR=/home/deploy/backups bash deploy/scripts/backup-db.sh >> /home/deploy/backups/backup.log 2>&1
  ```

- ⛔ **Off-site copy**: sync `/home/deploy/backups` to object storage (Cloudflare
  R2 / S3) so a lost VPS doesn't lose the backups. Needs an R2 bucket + `rclone`.
- Test a restore before launch (see the restore script header).

## 3. Payments — Plutu ⛔ (merchant account)

Currently **sandbox only**. See the `payments-plutu-sandbox` memory and
[../apps/api/.env.example](../apps/api/.env.example).

- ✅ Gateway is behind an interface; sandbox driver simulates OTP + webhook.
- ✅ `PLUTU_MODE=live` **throws at boot** — we can't accidentally ship sandbox
  charges as if they were real.
- ⛔ Get an **approved Plutu merchant account**; obtain API key/secret/access
  token and the real webhook secret.
- ⛔ **Write the live HTTP driver** (`LivePlutuGateway implements PlutuGateway`)
  against the real REST endpoints, select it in
  [`plutu.module.ts`](../apps/api/src/infrastructure/plutu/plutu.module.ts) when
  `PLUTU_MODE=live`. The interface + state machine + webhook handling are done; this
  is the only remaining payment code.
- ⛔ Register the production webhook URL with Plutu:
  `https://api.<domain>/api/v1/payments/webhook/plutu`.
- **Fallback if Plutu is delayed (per build prompt §3):** launch COD-only. To do
  that, hide Sadad/Adfali in the web `PaymentSection` (leave COD) — the backend
  already supports COD with no gateway. One small UI change, no backend work.

## 4. SMS provider 🟡 (provider choice + credentials)

- ✅ Sender is behind an interface (`SMS_SENDER`); dev driver logs OTPs to the
  API log.
- ⛔ Choose a provider (Twilio vs a Libyan gateway) and add its driver in
  [`sms.module.ts`](../apps/api/src/infrastructure/sms/sms.module.ts); select via
  env. Until then OTPs only appear in the logs — **real users can't receive codes**,
  so this is a hard launch blocker.

## 5. Secrets & environment 🟡

- ✅ Env is Zod-validated at boot ([`config/env.ts`](../apps/api/src/config/env.ts));
  a misconfigured deploy fails fast.
- ⛔ Generate **strong production secrets** (do NOT reuse the `.env.example`
  placeholders):

  ```bash
  openssl rand -hex 48   # JWT_ACCESS_SECRET
  openssl rand -hex 48   # JWT_REFRESH_SECRET
  openssl rand -hex 32   # POSTGRES_PASSWORD
  openssl rand -hex 32   # PLUTU_WEBHOOK_SECRET (must match Plutu config)
  ```

- ⛔ Set the production `SENTRY_DSN` (see §7). Confirm `CORS_ORIGINS` lists only the
  real web + admin origins.

## 6. Security 🟡 → mostly ✅

- ✅ Helmet security headers on the API; CORS locked to configured origins.
- ✅ Rate limiting: global 100/min; auth/OTP 5 per 15 min; **payment OTP-confirm
  throttled** to blunt OTP brute-forcing.
- ✅ JWT access/refresh with rotation; RBAC guards; every state change audited.
- ✅ Plutu webhook verifies an HMAC signature before acting; idempotent.
- ✅ Edge security headers (HSTS, X-Frame-Options, etc.) in the Caddyfile.
- 🟡 **Cloudflare** (⛔ budget/account): proxy DNS through Cloudflare, SSL mode
  "Full (strict)", enable the WAF managed ruleset, and turn on rate-limiting /
  bot-fight at the edge. Defense-in-depth on top of the app limits.
- 📝 Run a dependency audit (`pnpm audit`) and the repo's `/security-review` before
  launch.

## 7. Monitoring & observability 🟡

- ✅ Sentry wired ([`instrument.ts`](../apps/api/src/instrument.ts)); no-op until
  `SENTRY_DSN` is set. Pino structured logs.
- ✅ Health endpoint `GET /api/v1/health` (checks DB).
- ⛔ Create the **production Sentry project**, set the DSN, verify an event lands.
- ⛔ **Uptime monitoring** on `…/api/v1/health` (UptimeRobot / Better Stack — free
  tiers exist). Alert to email/Telegram.
- 🟡 Log retention: `docker compose logs` only. Optional: ship logs somewhere
  durable later.

## 8. CI / quality gates ✅

- ✅ CI runs lint (incl. import-boundary rules), typecheck, build, **and tests**.
- ✅ Husky pre-commit runs prettier on staged files.
- 📝 Add a Playwright E2E for register→book→pay before launch (build prompt §8;
  currently covered by unit/integration-style service tests).

## 9. Legal & content 📝

- ✅ Privacy policy + terms pages live at `/privacy` and `/terms` (ar + en),
  linked from the footer and referenced at registration.
- 📝 **The legal text is a developer draft and must be reviewed by a lawyer**
  familiar with Libyan law before launch. Arabic copy also needs native review
  (consistent with the project's copy rule).
- 📝 Confirm the company/contact details and the support phone/email placeholders
  in the policy.

---

## The short version — hard blockers before a real paying customer

1. ⛔ A VPS + domain (budget) — everything is dockerized and ready to deploy onto it.
2. ⛔ A real SMS provider — otherwise users never receive their OTP.
3. ⛔ Plutu merchant account + the live driver — OR launch COD-only as the fallback.
4. 📝 Lawyer-reviewed privacy/terms.
5. ⛔ Production secrets, Sentry DSN, uptime monitor, off-site backups.

Everything else in this list is already done in code or is a one-command setup on
the server.
