// POST /api/btc/pool-import
// Body: { addresses: [{ index: number, address: string }, ...] } | { addresses: ["bc1q...", ...], startIndex: 0 }
// Header: x-ops-secret: <ACCESS_CODE_SECRET>  (operator-only — Cloudflare Access also gates /operations/*)
// Bulk-imports BIP-84 (bc1q...) addresses pre-derived OFFLINE from a watch-only zpub.
import { json, methodNotAllowed, onOptions, parsePayload } from "../../_lib/http.js";

const BECH32_RE = /^bc1[qz][a-z0-9]{6,87}$/i;

export const onRequestOptions = () => onOptions("POST,OPTIONS");

export async function onRequestPost({ request, env }) {
    const expected = env?.ACCESS_CODE_SECRET;
    if (!expected) return json({ ok: false, error: "ops-secret-not-configured" }, { status: 503 });
    const provided = request.headers.get("x-ops-secret") || "";
    if (provided !== expected) return json({ ok: false, error: "unauthorized" }, { status: 401 });

    const db = env?.INTAKE_DB;
    if (!db) return json({ ok: false, error: "db-not-configured" }, { status: 503 });

    const payload = await parsePayload(request);
    if (!payload || !Array.isArray(payload.addresses)) {
        return json({ ok: false, error: "invalid-payload" }, { status: 400 });
    }
    if (payload.addresses.length === 0) return json({ ok: false, error: "empty" }, { status: 400 });
    if (payload.addresses.length > 5000) return json({ ok: false, error: "too-many" }, { status: 400 });

    const startIndex = Number.isInteger(payload.startIndex) ? payload.startIndex : 0;

    const rows = [];
    for (let i = 0; i < payload.addresses.length; i++) {
        const item = payload.addresses[i];
        let addr, idx;
        if (typeof item === "string") {
            addr = item.trim().toLowerCase();
            idx = startIndex + i;
        } else if (item && typeof item.address === "string") {
            addr = item.address.trim().toLowerCase();
            idx = Number.isInteger(item.index) ? item.index : startIndex + i;
        } else {
            return json({ ok: false, error: `invalid-row-${i}` }, { status: 400 });
        }
        if (!BECH32_RE.test(addr)) return json({ ok: false, error: `invalid-address-${i}`, value: addr }, { status: 400 });
        rows.push({ addr, idx });
    }

    let imported = 0;
    let skipped = 0;
    for (const r of rows) {
        try {
            const res = await db
                .prepare(
                    `INSERT OR IGNORE INTO btc_address_pool (derivation_index, address, status)
           VALUES (?, ?, 'unused')`
                )
                .bind(r.idx, r.addr)
                .run();
            if (res?.meta?.changes > 0) imported++;
            else skipped++;
        } catch {
            skipped++;
        }
    }

    const stats = await db
        .prepare(
            `SELECT
        SUM(CASE WHEN status = 'unused' THEN 1 ELSE 0 END) AS unused,
        SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) AS assigned,
        SUM(CASE WHEN status = 'spent' THEN 1 ELSE 0 END) AS spent,
        SUM(CASE WHEN status = 'retired' THEN 1 ELSE 0 END) AS retired,
        COUNT(*) AS total
       FROM btc_address_pool`
        )
        .first();

    return json({ ok: true, imported, skipped, pool: stats });
}

export const onRequest = ({ request, env }) => {
    const m = request.method.toUpperCase();
    if (m === "POST") return onRequestPost({ request, env });
    if (m === "OPTIONS") return onOptions("POST,OPTIONS");
    return methodNotAllowed("POST,OPTIONS");
};
