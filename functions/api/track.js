import { json, onOptions, parsePayload, methodNotAllowed } from "../_lib/http.js";
import { checkRateLimit, tooManyRequests } from "../_lib/rate-limit.js";

const ALLOWED_EVENTS = new Set([
    "call-link",
    "call-header",
    "whatsapp-link",
    "intake-submit",
    "newsletter-submit",
    "form-submit",
    "cta-click",
    "page-view"
]);

const norm = (v, max = 256) => {
    if (v === null || v === undefined) return "";
    return String(v).trim().slice(0, max);
};

const sha256Hex = async (input) => {
    const data = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
};

export const onRequestOptions = () => onOptions("POST, OPTIONS");

export const onRequest = async ({ request, env }) => {
    if (request.method === "OPTIONS") return onOptions("POST, OPTIONS");
    if (request.method !== "POST") return methodNotAllowed();

    // High ceiling — beacons fire freely. Still capped to absorb bot bursts.
    const rl = checkRateLimit(request, 60);
    if (!rl.allowed) return tooManyRequests(rl.retryAfter);

    let payload = {};
    try {
        payload = await parsePayload(request);
    } catch {
        // sendBeacon may post a Blob without proper content-type; tolerate it.
        try {
            const text = await request.clone().text();
            if (text) payload = JSON.parse(text);
        } catch {
            payload = {};
        }
    }

    const event = norm(payload.event, 64);
    if (!event || !ALLOWED_EVENTS.has(event)) {
        // Silently accept unknown events to avoid leaking schema. No-op.
        return json({ ok: true });
    }

    const path = norm(payload.path, 256);
    const label = norm(payload.label, 128);
    const referrer = norm(payload.referrer || request.headers.get("referer") || "", 256);
    const locale = norm(payload.locale, 4);
    const ip = request.headers.get("cf-connecting-ip") || "";
    const ua = request.headers.get("user-agent") || "";
    const country = request.headers.get("cf-ipcountry") || "";

    if (!env?.INTAKE_DB) {
        // Silent success — telemetry is best-effort.
        return json({ ok: true });
    }

    try {
        const salt = norm(env.TRACKING_SALT || "nxd-track-v1", 64);
        const [ipHash, uaHash] = await Promise.all([
            ip ? sha256Hex(`${salt}:${ip}`) : Promise.resolve(""),
            ua ? sha256Hex(`${salt}:${ua}`) : Promise.resolve("")
        ]);

        await env.INTAKE_DB.prepare(
            `INSERT INTO tracking_events
        (event, path, label, referrer, locale, ip_hash, ua_hash, country)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
            .bind(event, path, label, referrer, locale, ipHash, uaHash, country)
            .run();
    } catch {
        // Never fail the beacon. Telemetry must not block the user.
    }

    return json({ ok: true });
};
