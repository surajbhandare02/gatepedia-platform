# Gatepedia — Professional Audit Report

**Audit date:** 2026-05-30  
**Scope:** Full-stack (React, Express, PostgreSQL, Prisma, Redis, Socket.IO)  
**Method:** Static code review, architecture review, security review, build/test verification

---

## Executive summary

Gatepedia has evolved from a study-session CRUD app into a **feature-rich EdTech platform** with auth, syllabus, AI hooks, revision engine, productivity, admin, Docker, and CI. The foundation is **strong for a portfolio MVP**, but it is **not yet investor-demo / enterprise-ready** without addressing multi-tenant data isolation, dual-database access patterns, test coverage, and production secret management.

**Critical fixes applied in this audit (incremental):**

- User data isolation for progress list/analytics (removed `user_id IS NULL` leak across accounts)
- Prisma `update`/`delete` invalid `where` clause (runtime failure risk)
- Legacy `/progress` routes now require authentication
- Health check response aligned with tests (`ok` + `success`)
- CSRF skipped when `Authorization: Bearer` is present (SPA + refresh cookie coexistence)
- Production boot fails if default JWT/cookie secrets are used

---

## Phase 1 — Prioritized bug report

### Critical

| ID | Issue | Impact | Status |
|----|--------|--------|--------|
| C1 | Progress/analytics queried `user_id IS NULL OR user_id = $user` | Any logged-in user could see/edit anonymous sessions from other users | **Fixed** |
| C2 | `prisma.progress.update({ where: { id, OR: [...] } })` | Invalid Prisma API — updates/deletes could throw at runtime | **Fixed** |
| C3 | Legacy routes `/progress`, `/add-progress` without auth | Unauthenticated read/write of study data | **Fixed** (require JWT) |
| C4 | Default JWT/cookie secrets in `config/env.js` | Trivial account takeover if deployed as-is | **Fixed** (production guard) |

### High

| ID | Issue | Impact | Recommendation |
|----|--------|--------|----------------|
| H1 | Dual data layer: Prisma (progress/auth) + raw `pg` (analytics, syllabus, AI) | Schema drift, duplicate logic, harder migrations | Migrate services to Prisma repositories incrementally |
| H2 | Prisma `Progress.study_hours` is `Int?` vs SQL `NUMERIC` | Fractional hours truncated/lost | Align Prisma schema + migration |
| H3 | Refresh token in httpOnly cookie but SPA uses localStorage JWT only | Refresh flow unused; cookie set without CSRF wiring on client | Use `withCredentials` + refresh interceptor OR cookie-only auth |
| H4 | Helmet CSP disabled | XSS impact amplified if user-generated HTML ever rendered | Enable CSP for production build |
| H5 | Minimal automated tests (health only) | Regressions ship silently | Add auth, progress, syllabus integration tests |
| H6 | `npm audit` vulnerabilities in client deps | Supply-chain risk | `npm audit fix`, plan CRA → Vite migration |

### Medium

| ID | Issue | Impact | Recommendation |
|----|--------|--------|----------------|
| M1 | API response shape mixed (`success` vs historical `ok`) | Client confusion | Standardize on `{ success, data, message }` |
| M2 | No pagination on `/api/progress` | Slow dashboards at scale | `limit`/`cursor` query params |
| M3 | AI features depend on `OPENAI_API_KEY` with unclear fallbacks | Broken UX when unset | Graceful degraded mode + UI badges |
| M4 | `subjects.code` UNIQUE globally blocks per-user custom subjects | PDF upload collisions | Composite unique `(user_id, code)` |
| M5 | Zustand + React Query overlap | Duplicate caching sources | Query for server state, Zustand for UI prefs only |
| M6 | Missing `features/` folder structure on frontend | Harder scaling | Gradual move per domain |

### Low

| ID | Issue | Impact | Recommendation |
|----|--------|--------|----------------|
| L1 | Duplicate CSS (`App.css` + `dashboard.css` + Tailwind) | Bundle bloat | Consolidate on Tailwind + tokens |
| L2 | Achievement seed data static | Low engagement until wired | Hook achievements to events |
| L3 | OAuth routes stubbed | Dead UI if exposed | Hide until implemented |

---

## Phase 2–3 — Architecture assessment

### Current backend (good)

```
server/
├── config/          ✅ env, secrets
├── controllers/     ✅ thin HTTP layer
├── services/        ✅ business logic
├── middleware/      ✅ auth, security, cache, validate
├── routes/          ✅ api.js central router
├── validators/      ✅ Zod auth schemas
├── realtime/        ✅ Socket.IO
├── prisma/          ✅ schema
└── utils/           ✅ logger, cache, metrics
```

**Gap:** Missing `repositories/` — services mix Prisma and `pool.query` directly.

### Target backend (incremental)

Introduce `repositories/` per aggregate: `UserRepository`, `ProgressRepository`, `SyllabusRepository`. Services call repositories only.

### Current frontend (good)

- Lazy routes, React Query, Auth context, feature pages (Planner, Revision, Assistant)
- Component library emerging

**Gap:** No `features/` modules; some pages still orchestrate too much logic.

### Target frontend (incremental)

```
src/features/
  auth/
  dashboard/
  syllabus/
  analytics/
  ai/
```

Each feature: `components/`, `hooks/`, `api.js`, `types` (JSDoc).

---

## Phase 4 — UI/UX score drivers

**Strengths:** Dark mode, sidebar, charts, heatmap, glass-style panels, Framer Motion dep present, skeleton component.

**Gaps:**

- Design system not documented (tokens exist in CSS variables)
- Tailwind configured but not fully adopted everywhere
- Inconsistent empty/error states across new pages
- Limited a11y (focus rings, aria on tables/forms partial)

---

## Phase 5 — AI & extraordinary features (status)

| Feature | Status | Notes |
|---------|--------|-------|
| AI Study Planner | Partial | `/api/planner`, intelligence service |
| AI Readiness Score | Partial | Analytics snapshots table + insights |
| Smart Revision | Partial | `revisionEngineService`, schedule APIs |
| AI PYQ Analyzer | Partial | `/api/insights/pyq` |
| AI Notes | Partial | Summarize endpoint + UI component |
| Productivity Engine | Partial | Focus sessions, goals, dashboard |
| AI Tutor / Chat | Partial | Assistant routes |

**To reach “investor demo”:** unified AI panel with clear “demo mode” when no API key, latency indicators, and explainable scores.

---

## Phase 6 — Security audit (endpoint summary)

| Area | Status |
|------|--------|
| Helmet | ✅ Enabled (CSP off) |
| Rate limiting | ✅ Global + auth limiter |
| Input sanitization | ✅ Basic XSS strip on body/query |
| SQL injection | ✅ Parameterized queries (pg); Prisma ORM |
| JWT | ✅ Bearer; ⚠️ long-lived 7d default |
| Refresh tokens | ✅ Hashed in DB; cookie httpOnly |
| CSRF | ✅ Cookie-only sessions; Bearer exempt |
| RBAC | ✅ Admin routes guarded |
| File upload | ✅ Multer; verify size limits in upload controller |

**Still needed:** refresh token rotation, email verification enforcement, 2FA completion, audit logging for admin actions.

---

## Phase 7 — Performance

| Layer | Status |
|-------|--------|
| Frontend code splitting | ✅ `React.lazy` on routes |
| React Query cache | ✅ 30s staleTime |
| API caching | ✅ Redis middleware on analytics |
| DB indexes | ✅ Broad coverage in `schema.sql` |
| Pagination | ❌ Missing on list endpoints |

---

## Phase 8 — DevOps

| Item | Status |
|------|--------|
| Docker Compose | ✅ postgres, redis, api, client, nginx |
| GitHub Actions | ✅ API + client CI |
| DB init in CI | ✅ `db:init` + prisma generate |
| Prisma migrate in CI | ⚠️ Uses SQL script, not `migrate deploy` |
| Production env docs | ✅ `DEPLOYMENT_RUNBOOK.md` |

---

## Phase 9 — AI engineering architecture (recommended)

```
server/services/ai/
  ├── providers/openaiProvider.js   # API calls only
  ├── plannerService.js             # prompts + parsing
  ├── tutorService.js
  └── embeddingsService.js          # future: pgvector

server/jobs/                        # future
  └── aiInsightWorker.js
```

**Rules:** Never call OpenAI from controllers; store prompts/responses in `ai_insights` for traceability; rate-limit per user.

---

## Phase 10 — Portfolio scores

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Overall** | **72 / 100** | Strong feature breadth; needs hardening + tests + unified data layer |
| Security | 68 / 100 | Good middleware; fixed tenant leak; secrets/CSP/tests remain |
| Scalability | 65 / 100 | Indexes present; no pagination/queues |
| UI/UX | 78 / 100 | Polished dashboard; inconsistent design system adoption |
| Performance | 70 / 100 | Lazy routes + cache; heavy CRA bundle |
| Maintainability | 62 / 100 | Dual ORM/SQL; large schema; low test coverage |

---

## Roadmap

### Stage A — Professional SaaS (4–6 weeks)

1. Repository layer + Prisma-only writes for progress/syllabus  
2. Integration tests (auth, CRUD, analytics)  
3. Pagination + API versioning `/api/v1`  
4. Full Tailwind design system + Storybook  
5. Email verification + password reset UX  
6. Migrate fractional `study_hours` to Decimal in Prisma  

### Stage B — Startup MVP (2–3 months)

1. AI planner UI with explainable output  
2. Spaced repetition notifications (email/push)  
3. Stripe billing (free/pro tiers)  
4. Observability (Sentry, OpenTelemetry)  
5. Mobile-responsive PWA  
6. Onboarding wizard + sample data  

### Stage C — Enterprise platform (6–12 months)

1. Multi-tenant orgs (coaching institutes)  
2. RBAC fine-grained permissions  
3. Horizontal scaling (K8s, read replicas)  
4. Vector search on notes/PYQs  
5. SOC2-oriented audit logs  
6. White-label deployments  

---

## Suggested libraries (already used vs add)

| Already in project | Consider adding |
|--------------------|-----------------|
| React Query, Zustand, Recharts, Framer Motion | `@sentry/react`, `react-hook-form` |
| Zod, Helmet, Winston, Socket.IO | `pino` (optional), `bullmq` for jobs |
| Prisma, pdf-parse, multer | `pgvector` for semantic search |

---

## How to verify fixes locally

```bash
# Server
cd server
npm run db:init
npm run prisma:generate
npm test
npm run dev

# Client
cd client
npm start
```

Register a user, log sessions, confirm another account cannot see your rows.

---

*This document should be updated after each release milestone.*
