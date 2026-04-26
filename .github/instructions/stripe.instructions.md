---
description: Use when writing or modifying Stripe integration code (Checkout sessions, Payment Intents, webhooks, helpers in functions/_lib/stripe.js or any function calling Stripe). Triggers on: Stripe, checkout, payment intent, webhook, refund, idempotency.
applyTo: "functions/**/*stripe*.js,functions/_lib/stripe.js,functions/api/stripe-webhook.js,functions/api/checkout/**/*.js"
---

# Stripe integration rules — NEXURADATA

## Reuse, don't reimplement

- **Never** call `fetch("https://api.stripe.com/...")` directly from an endpoint. Always go through helpers in `functions/_lib/stripe.js` (`createHostedCheckoutSession`, `verifyStripeWebhook`, `stripeFetch`).
- If a needed helper is missing, add it to `_lib/stripe.js` with the same `stripeFetch(env, path, options)` shape. Keep `STRIPE_API_VERSION` pinned (currently `2026-02-25.clover`).
- Read the secret via `env.STRIPE_SECRET_KEY` only. Never log it. Never accept it from the request body.

## Amounts

- **All amounts are integer cents in CAD.** Convert dollars to cents with `Math.round(value * 100)`. Never store/transmit floats.
- Validate amount range: `Number.isFinite(cents) && cents > 0 && cents <= 1_000_000_00`.
- Currency must be lowercase `"cad"` for our market.

## Idempotency

- Every POST to Stripe must pass an `Idempotency-Key` derived from a stable business key (e.g. `checkout-session-${paymentRequestId}`, `refund-${paymentIntentId}`). Never use random UUIDs — that defeats the purpose.
- Mint the `paymentRequestId` (UUID) **before** calling Stripe so retries are safe.

## Checkout Sessions

- Use `mode=payment` (one-shot) unless explicitly building subscriptions.
- Always set `success_url` and `cancel_url` to absolute URLs on `nexuradata.ca` (FR) or `/en/` for English.
- Pass `client_reference_id` = our internal `paymentRequestId`.
- Set `metadata[case_id]`, `metadata[payment_request_id]`, `metadata[payment_kind]` on **both** the session and `payment_intent_data[metadata]` so refunds/disputes carry context.
- Set `locale` to `"fr"` for FR pages, `"en"` for EN pages.
- Set `customer_email` when known so Stripe pre-fills and sends a receipt.
- Enable `invoice_creation[enabled]=true` for legal invoices.

## Webhooks

- Always verify signature via `verifyStripeWebhook(env, request)` before doing anything with the payload. Never trust `request.body` alone.
- Webhook endpoint is `POST /api/stripe-webhook`. Return 200 quickly even on no-op events; only return non-200 on signature failure or DB error to trigger Stripe retry.
- Persist event IDs to dedupe; Stripe retries on timeout and we can receive the same event multiple times.
- Recognize at minimum: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`.

## Database (D1)

- Insert `payment_request` row **before** creating the Stripe session. Use the row's UUID as `paymentRequestId`. Webhook then updates status to `paid`/`failed`/`refunded`.
- Schema lives in `migrations/`. Any new column requires a new migration (`NNNN_*.sql`), not an in-place ALTER from code.

## Errors

- Bubble Stripe errors as `{ ok: false, error: "stripe-error", detail: message }` with HTTP 502, never 500. Stripe failure ≠ our bug.
- Surface user-actionable errors (`amount-too-small`, `email-invalid`) with 400.
- Never echo the raw Stripe error message to end users (may leak account/email). Echo a sanitized label; log the detail server-side.

## Testing (vitest)

- Mock `stripeFetch` at module level — never hit live Stripe in tests. Fixture path: see `tests/api/btc.test.js` and existing payment tests.
- Cover: missing secret → 503, invalid amount → 400, valid happy path → 200 with returned URL, idempotency key passed, webhook signature failure → 401.
- Run `npm test --silent` before committing any Stripe change. Must stay green at 194+ tests.

## What NOT to do

- Don't capture the card on our domain. We use Stripe Checkout (hosted), not Elements. Reduces PCI scope to SAQ-A.
- Don't store any card data, full PAN, CVV, or `pm_` IDs in our DB. Only store `pi_`, `cs_`, and metadata.
- Don't auto-refund from code without explicit ops authorization (`authorizeOpsRequest`). Refunds always go through `/api/ops/*` endpoints, never public APIs.
- Don't price in USD. Don't accept currency from the client. Currency is hard-coded `cad`.
