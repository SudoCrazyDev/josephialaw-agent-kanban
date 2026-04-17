# 07 — Deployment

## Target
- **Host**: user-owned EC2 instance
- **Domain**: `kanban.divorcewithaplan.com`
- **Reverse proxy**: the EC2 host's existing **nginx + certbot** (not in Docker)
- **App**: single Docker Compose service (`web`) bound to `127.0.0.1:3000`
- **DB**: Supabase Cloud (not in docker-compose)

## Why no Caddy
The host already runs nginx with certbot for TLS. Adding Caddy to docker-compose would mean two reverse proxies, two cert stores, and port-conflict gymnastics. Simpler: keep nginx on the host as the only public entrypoint, have it reverse-proxy to the container on loopback.

## docker-compose.yml

```yaml
services:
  web:
    build:
      context: .
      dockerfile: docker/Dockerfile
    image: agent-kanban:local
    restart: unless-stopped
    environment:
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_KEY: ${SUPABASE_KEY}
      NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
      MCP_TOKEN_PEPPER: ${MCP_TOKEN_PEPPER}
      CRON_SECRET: ${CRON_SECRET}
      NODE_ENV: production
    ports:
      - "127.0.0.1:3000:3000"  # loopback only — host nginx is the entrypoint
```

## nginx site

See [docker/nginx.conf.example](../docker/nginx.conf.example) — copy into `/etc/nginx/sites-available/kanban.divorcewithaplan.com`, symlink to `sites-enabled/`, then run certbot.

Two nginx settings that matter for this app:

| Setting | Value | Why |
|---|---|---|
| `proxy_http_version` | `1.1` | Required for WebSocket / SSE upgrade |
| `proxy_buffering` | `off` | MCP Streamable HTTP + Supabase realtime stream responses — buffering breaks the feed |
| `proxy_read_timeout` | `3600s` | Long-lived MCP connections; default 60s kills them mid-task |
| `Upgrade` + `Connection: upgrade` | set | Required for the transports above |

## Dockerfile (multi-stage, standalone Next.js)

```dockerfile
# --- deps
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# --- build
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- run (standalone)
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

`next.config.mjs` must set `output: "standalone"` (it already does).

## EC2 setup (once)
1. Launch Ubuntu 24.04 LTS (t3.small minimum, t3.medium for steadier load)
2. Security group: 80 + 443 open to the world, 22 restricted to your IP
3. Install Docker + Docker Compose plugin
4. `git clone` the repo to `/opt/agent-kanban`
5. Create `.env.production` from `.env.example`
6. DNS A record: `kanban.divorcewithaplan.com` → EC2 public IP
7. Copy `docker/nginx.conf.example` to `/etc/nginx/sites-available/kanban.divorcewithaplan.com`, symlink it, `nginx -t`, `systemctl reload nginx`
8. `sudo certbot --nginx -d kanban.divorcewithaplan.com` (certbot will rewrite the server block to add the 443 + SSL settings and set up auto-renewal)
9. `docker compose --env-file .env.production up -d`

From then on: nginx terminates TLS, proxies to the container on `127.0.0.1:3000`.

## CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          file: ./docker/Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository }}:latest

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /opt/agent-kanban
            docker compose pull
            docker compose up -d
            docker image prune -f
```

## Environment variables
See [.env.example](../.env.example) — in production, the minimum set is:
```
SUPABASE_URL=...
SUPABASE_KEY=...                      # service role, server-only
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...     # browser — for reads + realtime
NEXT_PUBLIC_APP_URL=https://kanban.divorcewithaplan.com
MCP_TOKEN_PEPPER=...                  # random, ≥32 chars
CRON_SECRET=...                       # random, ≥32 chars
```

Never commit `.env.production`. Use SSM Parameter Store or systemd `EnvironmentFile=` with proper permissions if you want to avoid a plaintext file on the box.

## Cron — release stale agents
Pick one of the scheduling options:

- **pg_cron** — uncomment the `cron.schedule(...)` block at the bottom of `supabase/migrations/0006_stale_release.sql` (free on Supabase, zero extra infra)
- **External scheduler** (GitHub Actions cron, cron-job.org, Upstash QStash) — hit `GET /api/cron/release-stale` with `Authorization: Bearer $CRON_SECRET` every minute
- **docker-compose sidecar** — small busybox container that loops `curl` with the bearer. See the deploy phase

## Backups
- Supabase Cloud has point-in-time restore on paid tiers
- The EC2 box holds no state except nginx + certbot certs (regeneratable)
- Losing the box = fresh EC2 → `git clone` → `docker compose up -d` → certbot reissues TLS

## Observability
- Docker logs: `docker compose logs -f web`
- Nginx access logs: `/var/log/nginx/access.log`
- Supabase dashboard: DB + Realtime metrics
- Later: Sentry for errors, PostHog for product analytics

## Bootstrapping moment
The first real task seeded into production (see [supabase/seed.sql](../supabase/seed.sql)):

```
title: Dockerize and deploy this kanban to EC2
type: devops.deploy
assignee: devops-agent-1
payload:
  repo: github.com/josephialaw/agent-kanban
  target: ec2
  domain: kanban.divorcewithaplan.com
  reverse_proxy: nginx (existing, host-level)
  tls: certbot (existing)
```

The DevOps Managed Agent works through this doc, opens subtasks for itself (write Dockerfile, write nginx site file, set up GitHub Actions, seed .env.production), and completes them. The board watches itself come online.
