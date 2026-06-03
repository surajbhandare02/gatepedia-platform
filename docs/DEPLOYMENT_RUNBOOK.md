# Production Deployment Runbook

## Local Container Smoke Test

```bash
docker compose up --build
```

Open:

- Web gateway: `http://localhost:8080`
- API health: `http://localhost:8080/health`
- Direct API: `http://localhost:5000/health/deep`

Apply the database schema when using a fresh database:

```bash
cd server
npm run db:init
```

## Required Production Secrets

Set these in the cloud platform secret manager:

```text
NODE_ENV=production
CLIENT_ORIGIN=https://your-domain.com
API_BASE_URL=https://api.your-domain.com
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=long-random-secret
JWT_REFRESH_SECRET=different-long-random-secret
COOKIE_SECRET=different-long-random-secret
OPENAI_API_KEY=optional
OPENAI_MODEL=gpt-4.1-mini
```

## Release Checklist

1. CI is green.
2. Database backup or snapshot exists.
3. Schema migrations are reviewed.
4. API deploy completes.
5. `/health/deep` returns healthy database and cache checks.
6. Client deploy completes.
7. Login, dashboard, planner, and websocket notification smoke tests pass.
8. Error logs and latency metrics are normal after release.

## Rollback Checklist

1. Revert to previous API image tag.
2. Revert client static build.
3. Restore database snapshot only if a breaking migration was applied.
4. Clear Redis keys if stale cached data affects the rollback.
5. Confirm `/health/deep`, login, dashboard, and planner.
