---
description: "Scaffold a new Cloudflare Pages Function API endpoint with standard handler structure, _lib imports, and input normalization."
agent: "agent"
---
Create a new API endpoint for the NEXURADATA platform.

**Path**: `functions/api/{{path}}.js`
**HTTP methods**: {{methods}}
**Purpose**: {{purpose}}
**Protected** (requires Cloudflare Access): {{protected}}

## Requirements

1. Create the file at `functions/api/{{path}}.js`
2. Use the standard ESM handler pattern:
   ```js
   import { json, onOptions, parsePayload } from "../_lib/http.js";
   // adjust ../ depth based on path

   export const onRequestOptions = () => onOptions("{{methods}}, OPTIONS");
   ```
3. Parse input with `parsePayload(context.request)`
4. Normalize all user text with `normalizeText()` / `normalizeMultilineText()` from `_lib/cases.js`
5. Use parameterized D1 queries via `context.env.INTAKE_DB` — never string interpolation
6. Return responses via `json({ ok: true, ... })` / `json({ ok: false, message }, { status })`
7. Wrap handler body in try/catch, return safe error messages
8. If protected, add `authorizeOpsRequest(request, env)` check from `_lib/cases.js`
9. Place any reusable logic in `functions/_lib/` — not inline in the endpoint
10. Follow patterns from `functions/api/intake.js` (public) or `functions/api/ops/cases.js` (protected)
