# Project Guidelines

## Overview

**NEXURADATA** — bilingual (FR primary, EN secondary) marketing site and operational platform for a data-recovery / digital-forensics lab in Montreal. Stack: Cloudflare Pages + Pages Functions, D1 (SQLite), Stripe (Checkout + webhooks), Resend (transactional email).

- FR pages at repository root; EN mirror under `en/` with the same filename.
- Backend is Cloudflare Pages Functions under `functions/api/` — ESM, no framework.
- Database schema in `migrations/`; `wrangler.jsonc` is the single source of truth for all bindings.

## Quick-start checklist

```bash
cp .dev.vars.example .dev.vars   # fill in secrets for local dev
npm install
npm run build                    # regenerate release-cloudflare/
npm run cf:d1:migrate:local      # apply DB migrations locally
npm run cf:dev                   # local dev server with Functions + D1
npm test                         # vitest unit tests — must stay green
```

Always run `npm test` after any change to `functions/`. See `README.md` for the full command list.

## Repository layout

```
nexuradata-site/
├── index.html                        # Home (FR)
├── en/index.html                     # Home (EN)
├── *.html                            # All other FR pages (flat at root)
├── en/*.html                         # EN mirrors of every page above
├── dossier/                          # Client case-tracking portal
├── operations/                       # Internal ops console (Access-protected)
├── assets/
│   ├── css/site.css                  # Single shared stylesheet
│   ├── js/                           # Public JS (site.js, appointments.js, …)
│   └── icons/                        # Logo SVGs, favicons, OG images
├── functions/
│   ├── _lib/                         # Shared helpers (http, cases, email, stripe)
│   ├── api/
│   │   ├── intake.js                 # Case intake (public POST)
│   │   ├── status.js                 # Client status lookup
│   │   ├── chat.js                   # Live chat
│   │   ├── newsletter.js             # Newsletter signup
│   │   ├── track.js                  # Analytics event tracking
│   │   ├── stripe-webhook.js         # Stripe webhook receiver
│   │   ├── checkout/                 # Stripe Checkout session endpoints
│   │   ├── appointments/             # Booking endpoints
│   │   ├── btc/                      # Bitcoin payment endpoints
│   │   ├── leads/                    # Lead-capture endpoints
│   │   ├── cron/                     # Scheduled workers
│   │   └── ops/                      # Ops-only actions (Access-protected)
│   └── en/                           # EN-specific function overrides (if any)
├── migrations/                       # D1 SQL migrations (0001_launch.sql → …)
├── tests/                            # Vitest unit tests
├── scripts/                          # Build and deploy helpers (Node)
├── docs/                             # Internal docs (branding-read-only.txt, …)
├── wrangler.jsonc                    # Cloudflare Pages/Functions config
├── _headers                          # Cloudflare security headers
├── _redirects                        # 301 redirects for SEO
└── release-cloudflare/               # ⚠ GENERATED — never edit directly
```

## Naming and path conventions

- **Page slugs**: kebab-case, French, geo-suffixed where relevant — e.g. `recuperation-donnees-montreal.html`.
- **EN pages**: identical slug under `en/` — e.g. `en/recuperation-donnees-montreal.html`.
- **API endpoints**: `functions/api/<resource>.js` (single file) or `functions/api/<resource>/[method].js`.
- **Migrations**: four-digit prefix + snake_case description — e.g. `0012_your_change.sql`.
- **JS helpers**: exported from `functions/_lib/`, never duplicated across endpoints.

## Bilingual rules

Every page added at root **must** have an EN counterpart under `en/` with the same filename. Always update both files when changing shared structure or content. Add both URLs to `sitemap.xml`. EN pages use `../` relative paths for assets.

## Build and deploy

| Command | What it does |
|---------|-------------|
| `npm run build` | Regenerates `release-cloudflare/` — run before every deploy |
| `npm run cf:dev` | Local dev with live reload, Functions, and D1 |
| `npm run cf:deploy` | Build + deploy to production |
| `npm run cf:deploy:staging` | Build + deploy to staging branch |
| `npm run cf:d1:migrate:local` | Apply D1 migrations locally |
| `npm run cf:d1:migrate:remote` | Apply D1 migrations to production |
| `npm test` | Vitest unit tests |

## Files agents may and may not touch

| May touch | May NOT touch |
|-----------|---------------|
| `*.html` at root and `en/` | `release-cloudflare/` (generated) |
| `assets/css/site.css` | `.github/agents/` (agent instructions) |
| `assets/js/*.js` | Secrets in `.dev.vars` |
| `functions/**/*.js` | Locked branding tokens in CSS |
| `migrations/*.sql` | `assets/nexuradata-master.svg` (locked logo) |
| `wrangler.jsonc` (bindings only) | Hardcoded secrets of any kind |
| `_headers`, `_redirects` | |
| `tests/**/*.js` | |

## Critical guardrails

- **`release-cloudflare/` is generated** — `npm run build` overwrites it. Never edit it directly.
- **Secrets** (`RESEND_API_KEY`, `ACCESS_CODE_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) must never appear in source code or logs. Read via `context.env.SECRET_NAME` only.
- **Branding is locked** — colors, fonts, logo, header, and footer structure are frozen. See `.github/instructions/branding.instructions.md`. Logo height (48–120 px depending on viewport) is the only adjustable branding property.
- **No new dependencies** without checking the GitHub Advisory Database first. Pin exact versions; don't use `^` or `~` in production code.
- **No copyright material** — do not paste unlicensed third-party code or assets.
- **D1 schema changes** require a new numbered migration file — never ALTER inline from application code.

## PR description rules

Keep PR descriptions short and scannable:

1. **One-sentence summary** on the first line — what changed and why, no jargon.
2. At most two sections, each with a **bold title**.
3. Use backticks for file paths, function names, and package handles.
4. No metadata fields (labels, checklist items, emoji status rows) unless the reviewer explicitly asked for them.

## Specialized instruction files

These are loaded automatically by Copilot when the `applyTo` glob matches — you don't need to reference them manually:

| File | Scope |
|------|-------|
| `.github/instructions/cloudflare-functions.instructions.md` | `functions/**/*.js` — handler pattern, `_lib` reuse, D1 queries, auth |
| `.github/instructions/stripe.instructions.md` | Stripe helpers, amounts, idempotency, webhooks |
| `.github/instructions/d1-migrations.instructions.md` | `migrations/**/*.sql` — naming, DDL, workflow |
| `.github/instructions/design-system.instructions.md` | `*.html`, `assets/**/*.css/js` — tokens, typography, forms |
| `.github/instructions/branding.instructions.md` | `*.html`, `assets/**/*.css` — locked header/footer/logo |

## Key documentation

- `README.md` — project overview, commands, Cloudflare Pages setup.
- `LAUNCH-RUNBOOK.md` — step-by-step launch (D1, email, Stripe, Access).
- `DEPLOY-FAST.md` — quick deployment options.
- `LAUNCH-CHECKLIST.md` — pre-launch content items.
- `SECURITY.md` — responsible disclosure policy.
