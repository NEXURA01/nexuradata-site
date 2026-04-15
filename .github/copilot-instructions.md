# Project Guidelines

## Overview

NEXURADATA is a bilingual (FR primary, EN secondary) marketing site and operational platform for a data-recovery and digital-forensics lab in Montreal. It runs on **Cloudflare Pages** with **Pages Functions** (Workers runtime), a **D1** database, **Stripe** payments, and **Resend** transactional email.

## Architecture

```
Root HTML pages (FR)  ─┐
en/*.html (EN)         ├─► npm run build ─► release-cloudflare/ ─► Cloudflare Pages
operations/*.html      ┘
functions/api/         ─► Cloudflare Pages Functions (Workers runtime)
functions/_lib/        ─► Shared server-side logic (D1, Stripe, email, HTTP helpers)
migrations/            ─► D1 SQL migrations
```

- **Public site**: static HTML pages at root (FR) and `en/` (EN). No framework, no bundler.
- **Client portal**: `suivi-dossier-client-montreal.html` — `noindex`, looks up case by ID + access code.
- **Operations console**: `operations/` — protected by Cloudflare Access; CRUD on cases, quotes, payments, follow-ups.
- **API layer**: `functions/api/` — public (`intake.js`, `status.js`, `stripe-webhook.js`) and protected (`ops/*`).
- **Config source of truth**: `wrangler.jsonc` — D1 bindings, env vars, compatibility date.

## Build and Test

```bash
npm install                     # install deps (wrangler only)
npm run build                   # regenerate release-cloudflare/ from tracked files
npm run cf:dev                  # local dev server with Pages Functions + D1
npm run cf:d1:migrate:local     # apply D1 migrations locally
npm run cf:d1:migrate:remote    # apply D1 migrations to production D1
npm run cf:check                # validate release output + Pages project exists
npm run cf:deploy               # deploy production (main)
npm run cf:deploy:staging       # deploy preview (staging)
```

There is no test suite yet. Validate changes via `npm run cf:dev`.

## Conventions

### HTML / CSS / JS
- Vanilla stack — no framework, no build step for front-end assets.
- Single CSS file: `assets/css/site.css`. Single JS file: `assets/js/site.js`.
- Design system rules live in `.github/instructions/design-system.instructions.md` — follow them for any HTML/CSS/JS work.
- Every public page must include `<link rel="canonical">` and `<link rel="alternate" hreflang>` pairs (FR ↔ EN).
- Legal/shell pages use `.page-shell`, `.page-hero`, `.page-grid`, `.page-card`, `.page-content` classes.

### Bilingual Pages
- French pages live at root (`/recuperation-donnees-montreal.html`).
- English mirrors live under `en/` with the same filename.
- Always update both languages when modifying shared content or structure.

### Cloudflare Functions
- Functions are plain ESM (`export async function onRequestPost`).
- Shared logic goes in `functions/_lib/` — never duplicate between endpoints.
- All user input is normalized via `normalizeText()` / `normalizeMultilineText()` from `_lib/cases.js`.
- Access codes are AES-GCM encrypted + SHA-256 hashed, never stored in plain text.
- Stripe webhook signatures are verified with timing-safe comparison in `_lib/stripe.js`.

### Build Output
- `release-cloudflare/` is **generated** by `npm run build` (`scripts/sync-release.mjs`). Never edit files there directly.
- `functions/` stays at repo root — Cloudflare Pages discovers them automatically.

### Security
- Security headers are in `_headers` (CSP, HSTS, X-Frame-Options, Permissions-Policy).
- `/operations/*` and `/api/ops/*` require Cloudflare Access — set `Cache-Control: no-store`.
- Env secrets (`RESEND_API_KEY`, `ACCESS_CODE_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) must never appear in code.

## Key Documentation

- `README.md` — project structure, prerequisites, Cloudflare Pages setup.
- `LAUNCH-RUNBOOK.md` — step-by-step launch guide (D1, email, Stripe, Access, verification).
- `LAUNCH-CHECKLIST.md` — pre-launch content items to finalize.
- `DEPLOY-FAST.md` — quick deployment options (Git integration, CLI, Direct Upload).
- `SECURITY.md` — vulnerability reporting (needs customization).
