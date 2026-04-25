// POST /api/leads/capture
// Logs an abandoned-quote lead so we can email a win-back later.
// Body: { email, name?, locale?, source?, device?, issue?, urgency?, estimateMinCad?, estimateMaxCad?, notes?, consent }
import { json, methodNotAllowed, onOptions, parsePayload } from "../../_lib/http.js";
import { checkRateLimit, tooManyRequests } from "../../_lib/rate-limit.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const norm = (v, max = 200) => `${v == null ? "" : v}`.trim().slice(0, max);
const intIn = (v, min, max) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(min, Math.min(max, Math.round(n)));
};

export const onRequestOptions = () => onOptions("POST,OPTIONS");

export async function onRequestPost({ request, env }) {
    const rl = await checkRateLimit(request, 8);
    if (!rl.allowed) return tooManyRequests(rl.retryAfter);

    const db = env?.INTAKE_DB;
    if (!db) return json({ ok: false, error: "db-not-configured" }, { status: 503 });

    const payload = await parsePayload(request);
    if (!payload) return json({ ok: false, error: "invalid-json" }, { status: 400 });

    // Honeypot
    if (norm(payload.website) || norm(payload.url)) return json({ ok: true, queued: false });

    const email = norm(payload.email, 254).toLowerCase();
    if (!EMAIL_RE.test(email)) return json({ ok: false, error: "invalid-email" }, { status: 400 });
    if (!payload.consent) return json({ ok: false, error: "consent-required" }, { status: 400 });

    // Skip if unsubscribed
    const unsub = await db
        .prepare(`SELECT email FROM email_unsubscribes WHERE email = ?`)
        .bind(email)
        .first();
    if (unsub) return json({ ok: true, queued: false, reason: "unsubscribed" });

    // De-dupe: same email + same device+issue within 24h → skip
    const dup = await db
        .prepare(
            `SELECT id FROM lead_captures
       WHERE email = ? AND device = ? AND issue = ?
         AND captured_at > datetime('now', '-1 day')
       LIMIT 1`
        )
        .bind(email, norm(payload.device, 40), norm(payload.issue, 40))
        .first();
    if (dup) return json({ ok: true, queued: false, reason: "duplicate" });

    const ip = request.headers.get("cf-connecting-ip") || "";
    const ua = request.headers.get("user-agent") || "";

    await db
        .prepare(
            `INSERT INTO lead_captures
       (email, name, locale, source, device, issue, urgency,
        estimate_min_cad, estimate_max_cad, notes, consent_ip, consent_ua)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
            email,
            norm(payload.name, 120),
            norm(payload.locale, 5) === "en" ? "en" : "fr",
            norm(payload.source, 40) || "quote",
            norm(payload.device, 40),
            norm(payload.issue, 40),
            norm(payload.urgency, 20),
            intIn(payload.estimateMinCad, 0, 1_000_000),
            intIn(payload.estimateMaxCad, 0, 1_000_000),
            norm(payload.notes, 1000),
            ip.slice(0, 64),
            ua.slice(0, 240)
        )
        .run();

    return json({ ok: true, queued: true });
}

export const onRequest = ({ request, env }) => {
    const m = request.method.toUpperCase();
    if (m === "POST") return onRequestPost({ request, env });
    if (m === "OPTIONS") return onOptions("POST,OPTIONS");
    return methodNotAllowed("POST,OPTIONS");
};
