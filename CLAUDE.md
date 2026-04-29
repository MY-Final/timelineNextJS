# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Next.js 16 Breaking Changes

This project uses **Next.js 16** which has breaking changes from earlier versions. Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (especially `01-app/` and `03-architecture/`). Heed deprecation notices.

## Commands

```bash
npm run dev        # Start dev server (default port 3000)
npm run build      # Production build (outputs standalone for Docker)
npm run start      # Run production server
npm run lint       # ESLint (next/core-web-vitals + typescript rules)
```

No test framework is configured in this project.

## Environment Setup

Copy `.env.example` to `.env.local` for local development. Key variables:
- `DB_TYPE` — `"self-hosted"` (PostgreSQL) or `"supabase"` (cloud)
- `REDIS_TYPE` — `"self-hosted"` (ioredis) or `"upstash"` (cloud)
- `JWT_SECRET` — required, minimum 32 characters
- Cloudflare R2 credentials for image upload (optional)

Database init: manually run SQL files in `db/` in order (01–10, then `99_functions_and_seed.sql`, then `seed_superadmin.sql`). Docker handles this automatically.

## Architecture

**Stack**: Next.js 16 (App Router) / React 19 / TypeScript / Tailwind CSS 4 / PostgreSQL / Redis / Cloudflare R2

### Directory Layout

- `app/` — Next.js App Router: pages + API routes
  - `app/api/` — REST API endpoints (Swagger JSDoc annotations on each route)
  - `app/admin/` — Admin dashboard pages
  - `app/(public pages)` — `/`, `/timeline`, `/tags`, `/login`, `/profile`, `/api-docs`
- `components/pages/` — Page-level components (HomePage, TimelinePage, Admin pages, etc.)
- `components/ui/` — Reusable UI components + `common/` for SiteTopNav, PublicBottomNav
- `components/easter-eggs/` — Hidden interactive features
- `lib/` — Core utilities (see below)
- `db/` — SQL schema files (`01_*.sql`–`10_*.sql`) + `functions/` for PostgreSQL stored functions + seed data
- `styles/` — Per-page CSS files alongside global styles
- `data/` — Static data (email templates JSON)

### Key `lib/` Modules

| Module | Purpose |
|---|---|
| `db.ts` | PostgreSQL connection pool (lazy-loaded Proxy). Switches between self-hosted and Supabase via `DB_TYPE` |
| `redis.ts` | Redis client factory. Switches between ioredis and Upstash via `REDIS_TYPE`. Also has OTP helpers |
| `jwt.ts` | JWT sign/verify using `jsonwebtoken` |
| `auth.ts` | `getAuthUser(request)` — extracts JWT from HttpOnly Cookie (preferred) or `Authorization: Bearer` header. Returns user payload or 401 NextResponse |
| `auth-role.ts` | Client-side role helpers reading from `localStorage` |
| `result.ts` | Standardized API response format: `ok()`/`fail()` constructors + `successResponse()`/`errorResponse()` NextResponse helpers. Error codes: 0=success, 400xx=bad request, 401xx=unauthorized, 403xx=forbidden, 404xx=not found, 500xx=server error |
| `r2.ts` | Cloudflare R2 (S3-compatible) upload helpers |
| `mailer.ts` | Email sending (Nodemailer + Resend) |
| `site-settings.ts` | Site-wide settings from `site_settings` DB table with Redis caching |
| `supabase.ts` | Supabase client (used when `DB_TYPE=supabase`) |

### API Route Pattern

All API routes follow this pattern:
1. Import `successResponse`/`errorResponse` from `@/lib/result`
2. Import `getAuthUser` from `@/lib/auth` for protected routes
3. Check `DB_TYPE` to branch between direct PostgreSQL queries (`pool`) and Supabase client
4. Return standardized responses via `successResponse(data, message)` or `errorResponse(code, message)`

Roles: `superadmin` > `admin` > `user`. Admin routes check `role === 'admin' || role === 'superadmin'`.

### Dual-Backend Pattern

The codebase supports two database backends and two Redis backends, selected by environment variables. API routes contain `if (DB_TYPE === 'supabase')` branches. Keep both branches in sync when modifying queries.

### UI Conventions

- Language: Chinese (zh-CN) for all UI text, comments, and error messages
- Fonts: Geist (sans-serif), Noto Serif SC (serif Chinese), Zhi Mang Xing (handwritten Chinese)
- Styling: Tailwind CSS utility classes + per-page CSS files in `styles/`
- Animations: Framer Motion
- Icons: Lucide React
- Path alias: `@/*` maps to project root

### Docker

Multi-stage Dockerfile producing a standalone Next.js image. `docker-compose.yml` runs app + PostgreSQL + Redis together. The app container exposes port 3000 mapped to host port 9421.
