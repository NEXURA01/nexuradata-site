// GET/POST /api/leads/unsubscribe?email=...&t=...
// One-click unsubscribe link from win-back emails. Returns a small HTML confirmation.
import { json, methodNotAllowed, onOptions } from "../../_lib/http.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const page = (msg, isFr) => `<!doctype html>
<html lang="${isFr ? "fr" : "en"}"><head><meta charset="utf-8">
<title>${isFr ? "Désinscription" : "Unsubscribed"} · NEXURA DATA</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:'IBM Plex Sans',Arial,sans-serif;background:#0d0d0b;color:#e8e4dc;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
.card{background:#1c1c19;padding:32px 28px;border-radius:1rem 1rem 1rem 0.35rem;max-width:480px;border:1px solid rgba(232,228,220,0.22)}
h1{margin:0 0 12px;font-size:20px;color:#e8e4dc}
p{margin:0 0 12px;line-height:1.6;color:#c4b8a8}
a{color:#e8e4dc}
</style></head><body>
<div class="card"><h1>${isFr ? "Désinscription confirmée" : "Unsubscribed"}</h1><p>${msg}</p>
<p><a href="/">${isFr ? "Retour au site NEXURA DATA" : "Back to NEXURA DATA"}</a></p></div>
</body></html>`;

async function unsubscribe(env, email) {
    const db = env?.INTAKE_DB;
    if (!db) return { ok: false };
    await db
        .prepare(
            `INSERT INTO email_unsubscribes (email, reason) VALUES (?, 'one-click')
       ON CONFLICT(email) DO UPDATE SET unsubscribed_at = datetime('now')`
        )
        .bind(email)
        .run();
    await db
        .prepare(`UPDATE lead_captures SET unsubscribed_at = datetime('now') WHERE email = ?`)
        .bind(email)
        .run();
    return { ok: true };
}

export const onRequestOptions = () => onOptions("GET,POST,OPTIONS");

export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    const email = (url.searchParams.get("email") || "").trim().toLowerCase();
    const isFr = !url.pathname.startsWith("/en/") && !(url.searchParams.get("lang") === "en");
    if (!EMAIL_RE.test(email)) {
        return new Response(page(isFr ? "Lien invalide ou expiré." : "Invalid or expired link.", isFr), {
            status: 400,
            headers: { "content-type": "text/html; charset=utf-8" },
        });
    }
    const r = await unsubscribe(env, email);
    if (!r.ok) {
        return new Response(page(isFr ? "Service indisponible. Réessayez plus tard." : "Service unavailable. Try again later.", isFr), {
            status: 503,
            headers: { "content-type": "text/html; charset=utf-8" },
        });
    }
    return new Response(
        page(
            isFr
                ? `L'adresse <strong>${email}</strong> ne recevra plus de courriels de relance NEXURA DATA. Vous pouvez toujours nous écrire à contact@nexuradata.ca pour toute demande.`
                : `The address <strong>${email}</strong> will no longer receive NEXURA DATA reminder emails. You can still write to contact@nexuradata.ca for any request.`,
            isFr
        ),
        { headers: { "content-type": "text/html; charset=utf-8" } }
    );
}

export async function onRequestPost({ request, env }) {
    const url = new URL(request.url);
    const email = (url.searchParams.get("email") || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return json({ ok: false, error: "invalid-email" }, { status: 400 });
    const r = await unsubscribe(env, email);
    return r.ok ? json({ ok: true }) : json({ ok: false }, { status: 503 });
}

export const onRequest = ({ request, env }) => {
    const m = request.method.toUpperCase();
    if (m === "GET") return onRequestGet({ request, env });
    if (m === "POST") return onRequestPost({ request, env });
    if (m === "OPTIONS") return onOptions("GET,POST,OPTIONS");
    return methodNotAllowed("GET,POST,OPTIONS");
};
