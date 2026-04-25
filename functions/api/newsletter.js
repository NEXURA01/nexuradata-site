import { json, onOptions, parsePayload, methodNotAllowed } from "../_lib/http.js";
import { checkRateLimit, tooManyRequests } from "../_lib/rate-limit.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const norm = (v, max = 256) => {
    if (v === null || v === undefined) return "";
    return String(v).trim().slice(0, max);
};

const randomToken = () => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

export const onRequestOptions = () => onOptions("POST, OPTIONS");

export const onRequest = async ({ request, env }) => {
    if (request.method === "OPTIONS") return onOptions("POST, OPTIONS");
    if (request.method !== "POST") return methodNotAllowed();

    const rl = checkRateLimit(request, 5);
    if (!rl.allowed) return tooManyRequests(rl.retryAfter);

    let payload;
    try {
        payload = await parsePayload(request);
    } catch {
        return json({ ok: false, message: "Format invalide." }, { status: 400 });
    }

    // Honeypot field — if filled, silently accept and discard.
    if (norm(payload.website || payload.url || "")) {
        return json({ ok: true, message: "Merci." });
    }

    const email = norm(payload.email).toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) {
        return json({ ok: false, message: "Adresse courriel invalide." }, { status: 400 });
    }

    const locale = norm(payload.locale, 4) === "en" ? "en" : "fr";
    const source = norm(payload.source, 64) || "unknown";
    const consentText = norm(payload.consent_text, 500)
        || (locale === "en"
            ? "I agree to receive occasional emails from NEXURA DATA. I can unsubscribe at any time."
            : "J'accepte de recevoir des courriels occasionnels de NEXURA DATA. Je peux me désinscrire à tout moment.");

    const ip = request.headers.get("cf-connecting-ip") || "";
    const ua = norm(request.headers.get("user-agent") || "", 256);
    const token = randomToken();

    if (!env?.INTAKE_DB) {
        return json({ ok: false, message: "Service indisponible." }, { status: 503 });
    }

    try {
        const result = await env.INTAKE_DB.prepare(
            `INSERT INTO newsletter_subscribers
        (email, locale, source, consent_text, consent_ip, consent_ua, unsubscribe_token)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         status = 'active',
         locale = excluded.locale,
         source = excluded.source,
         unsubscribed_at = NULL`
        ).bind(email, locale, source, consentText, ip, ua, token).run();

        return json({
            ok: true,
            message: locale === "en"
                ? "You're on the list. Welcome."
                : "Inscription confirmée. Merci."
        });
    } catch (err) {
        return json({ ok: false, message: "Erreur enregistrement." }, { status: 500 });
    }
};
