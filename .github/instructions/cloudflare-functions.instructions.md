---
description: "Use when writing or editing Cloudflare Pages Functions. Covers ESM exports, _lib reuse, input normalization, error handling, auth, and secret access. Triggers on: API endpoint, function, worker, D1 query, webhook."
applyTo: "functions/**/*.js"
---
# Cloudflare Pages Functions

## Handler Pattern

Export named ESM handlers — not default exports:

```js
export const onRequestOptions = () => onOptions("GET, POST, OPTIONS");

export const onRequestPost = async (context) => {
  // context.env   → D1 bindings, env vars, secrets
  // context.request → standard Request object
};
```

Available handler names: `onRequestGet`, `onRequestPost`, `onRequestPut`, `onRequestDelete`, `onRequestOptions`.

## Shared Libraries (`functions/_lib/`)

Never duplicate logic between endpoints. Import from `_lib/`:

| Module | Purpose |
|--------|---------|
| `http.js` | `json()`, `onOptions()`, `parsePayload()`, `methodNotAllowed()` |
| `cases.js` | `normalizeText()`, `normalizeMultilineText()`, `validateSubmission()`, case CRUD, access code crypto |
| `email.js` | `sendClientAccessEmail()`, `sendClientStatusEmail()`, `sendLabNotificationEmail()` |
| `stripe.js` | `createHostedCheckoutSession()`, `verifyStripeWebhook()` |

## Input Handling

- Always parse input with `parsePayload(context.request)` (handles JSON + form data).
- Normalize all text with `normalizeText(value, maxLength)` or `normalizeMultilineText(value, maxLength)`.
- Validate against allow-lists (Sets) for enum inputs.

## Response Format

Always return via the `json()` helper from `_lib/http.js`:

```js
return json({ ok: true, caseId }, { status: 200 });
return json({ ok: false, message: "..." }, { status: 400 });
```

## Error Handling

Wrap the handler body in try/catch. Return user-safe messages — never leak internals:

```js
try {
  // ...
} catch (error) {
  return json({ ok: false, message: error.message || "Erreur interne." }, { status: 500 });
}
```

## Protected Endpoints (`functions/api/ops/`)

- Require Cloudflare Access — use `authorizeOpsRequest(request, env)` from `_lib/cases.js`.
- Return 403 on auth failure, never reveal internal details.

## Secrets

Access via `context.env.SECRET_NAME`. Never log, hardcode, or return secrets in responses. Required secrets: `RESEND_API_KEY`, `ACCESS_CODE_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

## D1 Queries

- Access the database via `context.env.INTAKE_DB`.
- Use parameterized queries — never interpolate user input into SQL.
- Check binding availability before querying (`if (!context.env?.INTAKE_DB)`).
