// POST /api/btc/invoice
// Body: { caseRef, amountCad, expiresMin?, locale? }
// Returns: { ok, ref, address, amountSats, amountCad, rateCadPerBtc, expiresAt }
// Pulls next unused address from btc_address_pool, locks it to the invoice.
import { json, methodNotAllowed, onOptions, parsePayload } from "../../_lib/http.js";
import { checkRateLimit, tooManyRequests } from "../../_lib/rate-limit.js";

const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const genRef = () => {
    const buf = new Uint8Array(8);
    crypto.getRandomValues(buf);
    let out = "BTC-";
    for (const b of buf) out += REF_CHARS[b % REF_CHARS.length];
    return out;
};

const norm = (v, max = 80) => `${v == null ? "" : v}`.trim().slice(0, max);

async function fetchRateCadPerBtc() {
    try {
        const r = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=cad",
            { cf: { cacheTtl: 60 } }
        );
        if (!r.ok) return 0;
        const j = await r.json();
        const v = Number(j?.bitcoin?.cad);
        return Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
    } catch {
        return 0;
    }
}

export const onRequestOptions = () => onOptions("POST,OPTIONS");

export async function onRequestPost({ request, env }) {
    const rl = await checkRateLimit(request, 10);
    if (!rl.allowed) return tooManyRequests(rl.retryAfter);

    const db = env?.INTAKE_DB;
    if (!db) return json({ ok: false, error: "db-not-configured" }, { status: 503 });

    const payload = await parsePayload(request);
    if (!payload) return json({ ok: false, error: "invalid-json" }, { status: 400 });

    const caseRef = norm(payload.caseRef);
    const amountCad = Number(payload.amountCad);
    const expiresMin = Math.min(120, Math.max(5, Number(payload.expiresMin) || 30));

    if (!Number.isFinite(amountCad) || amountCad <= 0 || amountCad > 1_000_000) {
        return json({ ok: false, error: "invalid-amount" }, { status: 400 });
    }

    const rate = await fetchRateCadPerBtc();
    if (!rate) return json({ ok: false, error: "rate-unavailable" }, { status: 503 });

    const amountSats = Math.round((amountCad / rate) * 1e8);
    if (amountSats < 5000) {
        return json({ ok: false, error: "amount-too-small", minCad: Math.ceil((5000 / 1e8) * rate) }, { status: 400 });
    }

    // Atomically claim the next unused address.
    // SQLite UPDATE ... RETURNING is supported in D1.
    const claim = await db
        .prepare(
            `UPDATE btc_address_pool
       SET status = 'assigned', assigned_at = datetime('now'), assigned_to_ref = ?
       WHERE id = (SELECT id FROM btc_address_pool WHERE status = 'unused' ORDER BY derivation_index ASC LIMIT 1)
       RETURNING id, derivation_index, address`
        )
        .bind("pending")
        .first();

    if (!claim) {
        return json({ ok: false, error: "address-pool-empty" }, { status: 503 });
    }

    const ref = genRef();
    const expiresAt = new Date(Date.now() + expiresMin * 60_000).toISOString();
    const amountCadCents = Math.round(amountCad * 100);

    try {
        await db
            .prepare(
                `INSERT INTO btc_invoices
         (ref, case_ref, address, derivation_index, amount_sats, amount_cad_cents, rate_cad_per_btc, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(ref, caseRef, claim.address, claim.derivation_index, amountSats, amountCadCents, rate, expiresAt)
            .run();

        // Update pool row with the actual ref.
        await db
            .prepare(`UPDATE btc_address_pool SET assigned_to_ref = ? WHERE id = ?`)
            .bind(ref, claim.id)
            .run();
    } catch (e) {
        // Roll back the address claim so it can be reused.
        await db
            .prepare(`UPDATE btc_address_pool SET status = 'unused', assigned_to_ref = '', assigned_at = '' WHERE id = ?`)
            .bind(claim.id)
            .run();
        return json({ ok: false, error: "invoice-insert-failed" }, { status: 500 });
    }

    return json({
        ok: true,
        ref,
        address: claim.address,
        derivationIndex: claim.derivation_index,
        amountSats,
        amountBtc: amountSats / 1e8,
        amountCad,
        rateCadPerBtc: rate,
        expiresAt,
        paymentUri: `bitcoin:${claim.address}?amount=${(amountSats / 1e8).toFixed(8)}`,
    });
}

export const onRequest = ({ request, env }) => {
    const m = request.method.toUpperCase();
    if (m === "POST") return onRequestPost({ request, env });
    if (m === "OPTIONS") return onOptions("POST,OPTIONS");
    return methodNotAllowed("POST,OPTIONS");
};
