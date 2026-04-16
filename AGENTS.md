<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## Stack

- **Next.js 16** + **React 19** + **TypeScript** (strict mode)
- **Tailwind CSS v4** — no `tailwind.config.js`; all tokens defined via `@theme inline {}` in `app/globals.css`
- `@base-ui/react` for headless UI primitives (Button)
- `cva` + `clsx` + `tailwind-merge` — use `cn()` from `lib/utils.ts` for all className merging

---

## Dev Commands

```bash
npm run dev       # runs generate-image-manifest.mjs first, then next dev
npm run build     # runs generate-image-manifest.mjs first, then next build
npm run lint      # eslint v9 flat config, no path needed

# Cloudflare / D1 / R2
npx wrangler d1 execute timeline-db --remote --file=migrations/0001_init.sql   # apply migration
node scripts/seed.mjs                                                            # seed events.json → D1
npx wrangler pages deploy .open-next                                            # deploy to Cloudflare Pages
```

No test framework exists. Do not add test scripts without explicit instruction.

---

## Architecture

### Directory layout

```
app/              # Thin App Router shells only — one-liner re-exports
  api/            # Route Handlers (auth, posts, upload)
  admin/          # Admin UI (login + dashboard)
components/
  pages/          # All real page logic lives here (use "use client")
    AdminPage.tsx # Post management dashboard
    LoginPage.tsx # Admin login form
  ui/             # Reusable primitives
    PostEditor.tsx  # Markdown editor + image upload
  easter-eggs/    # Easter egg display components
data/
  events.json     # Legacy static data — kept for seed script only
  image-manifest.json  # AUTO-GENERATED — never edit by hand
lib/
  utils.ts        # cn() helper
  images.ts       # getImagesByDate() via manifest (local dev fallback)
  gallery.ts      # Fan/card layout math
  easter-eggs.ts  # All interactive easter egg hooks
  db.ts           # D1 database helpers (getCloudflareContext)
  r2.ts           # R2 upload helper
  auth.ts         # requireAuth() middleware helper
  session.ts      # iron-session cookie logic
migrations/
  0001_init.sql   # D1 schema (posts + images tables)
scripts/
  generate-image-manifest.mjs  # Scans public/images/, rewrites manifest
  seed.mjs        # Seeds events.json into D1 via wrangler CLI
styles/           # Per-page CSS files, all imported in app/globals.css
  Admin.css       # Admin/Login/PostEditor styles
public/images/    # Photos organized as <YYYY-MM-DD>/<filename>
```

### Key rules

- **`@/` alias → project root** (no `src/` directory). `@/lib/utils` = `./lib/utils`.
- All `app/*/page.tsx` are Server Components that simply render a client component from `components/pages/`.
- All page-level components have `"use client"` — currently no Server Component data fetching.
- Page-specific CSS lives in `styles/`, not co-located with components; imported via `app/globals.css`.
- `data/image-manifest.json` is auto-regenerated on every `dev`/`build`/`start` via npm `pre*` hooks — committing it is intentional but never edit it manually.
- Use native `<img>` for timeline photos (not `next/image`). External QQ avatar URLs are used directly.
- `React.memo()` is used on performance-sensitive components (`PhotoGallery`, `EventCard`, `SideNav`).

---

## Coding Conventions

- **Tailwind utilities** for layout/spacing; **dedicated CSS files in `styles/`** for complex component styles. No CSS Modules, no styled-components.
- CSS class naming: kebab-case BEM-like (`timeline-card`, `fan-gallery`, `home-shell`).
- Design tokens as CSS custom properties in `:root` in `globals.css`, re-exposed via `@theme inline {}`.
- Fonts loaded via `next/font/google`; exposed as CSS variables (`--font-geist-sans`, `--font-serif-cn`, `--font-handwritten-cn`) and utility classes (`.font-serif-cn`, `.font-handwritten-cn`).
- `Button` component: extend with `cva` variants; use `@base-ui/react/button` as primitive.

---

## Adding Content

~~To add a timeline event via static JSON:~~
Use the admin dashboard at `/admin` (requires `ADMIN_PASSWORD` env var).

### Environment Variables Required

| Variable | Description |
|---|---|
| `ADMIN_PASSWORD` | Plain-text admin password |
| `SESSION_SECRET` | ≥32-char random string for iron-session |
| `R2_PUBLIC_DOMAIN` | Public URL prefix for R2 bucket (e.g. `https://pub-xxx.r2.dev`) |

Set these in Cloudflare Pages → Settings → Environment Variables.

### Infrastructure

- **D1**: `timeline-db` (id: `244bffe6-e8dd-4e52-9469-81137071444f`)
- **R2**: `timeline` (configure public access domain)
- Bindings declared in `wrangler.toml`; accessed via `getCloudflareContext()` from `@opennextjs/cloudflare`
