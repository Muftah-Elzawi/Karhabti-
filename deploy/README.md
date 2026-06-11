# Karhabti staging deployment (single VPS)

Target shape: one Linux VPS (2 GB+ RAM) running Docker, with Caddy terminating
HTTPS in front of the API and web containers, plus Postgres and Redis with
persistent volumes. Admin joins later the same way.

## Prerequisites

1. A VPS with Docker Engine + Compose plugin installed (Ubuntu 22.04+ typical).
2. A domain with two A records pointing at the VPS:
   `staging.<domain>` and `api.staging.<domain>` (or your chosen names).
3. The repo cloned on the server (deploy user, not root).

## First deploy

```bash
git clone <repo-url> karhabti && cd karhabti
cp deploy/.env.staging.example deploy/.env.staging
nano deploy/.env.staging        # domain + secrets (openssl rand -hex 32)

docker compose -f deploy/docker-compose.staging.yml --env-file deploy/.env.staging up -d --build
docker compose -f deploy/docker-compose.staging.yml --env-file deploy/.env.staging --profile migrate run --rm migrate
```

Verify:

```bash
curl https://api.staging.<domain>/api/v1/health   # {"data":{"status":"ok","database":"up",...}}
# then open https://staging.<domain> and run register → OTP → profile.
# OTP appears in the API logs until a real SMS provider is wired:
docker compose -f deploy/docker-compose.staging.yml logs api | grep "SMS"
```

## Updating

```bash
git pull
docker compose -f deploy/docker-compose.staging.yml --env-file deploy/.env.staging up -d --build
# run the migrate profile again if the Prisma schema changed
```

## Notes

- Web is also deployable to Vercel instead (set `NEXT_PUBLIC_API_URL` to the
  staging API URL); this compose keeps everything on one box for simplicity.
- Production hardening (backups, firewall, Cloudflare, monitoring) is
  Phase 3 — this is staging.
