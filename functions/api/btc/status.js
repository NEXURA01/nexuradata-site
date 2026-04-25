// GET /api/btc/status?ref=BTC-XXXX
// Polls mempool.space for the invoice's address, updates DB, returns current state.
import { json, methodNotAllowed, onOptions } from "../../_lib/http.js";
import { checkRateLimit, tooManyRequests } from "../../_lib/rate-limit.js";

const MIN_POLL_INTERVAL_MS = 8000;
const REQUIRED_CONFIRMATIONS = 2;

async function fetchAddressStats(address) {
    // mempool.space returns chain_stats + mempool_stats with received/spent counts.
    const r = await fetch(`https://mempool.space/api/address/${address}`, {
        cf: { cacheTtl: 5 },
    });
    if (!r.ok) throw new Error(`mempool-${r.status}`);
    return r.json();
}

async function fetchAddressTxs(address) {
    const r = await fetch(`https://mempool.space/api/address/${address}/txs`, {
        cf: { cacheTtl: 5 },
    });
    if (!r.ok) return [];
    return r.json();
}

async function fetchTipHeight() {
    try {
        const r = await fetch("https://mempool.space/api/blocks/tip/height", { cf: { cacheTtl: 30 } });
        if (!r.ok) return 0;
        return Number(await r.text()) || 0;
    } catch {
        return 0;
    }
}

export const onRequestOptions = () => onOptions("GET,OPTIONS");

export async function onRequestGet({ request, env }) {
    const rl = await checkRateLimit(request, 30);
    if (!rl.allowed) return tooManyRequests(rl.retryAfter);

    const db = env?.INTAKE_DB;
    if (!db) return json({ ok: false, error: "db-not-configured" }, { status: 503 });

    const url = new URL(request.url);
    const ref = (url.searchParams.get("ref") || "").trim().slice(0, 32);
    if (!/^BTC-[A-Z0-9]{8}$/.test(ref)) {
        return json({ ok: false, error: "invalid-ref" }, { status: 400 });
    }

    const inv = await db
        .prepare(
            `SELECT ref, case_ref, address, amount_sats, amount_cad_cents, rate_cad_per_btc,
              status, created_at, expires_at, first_seen_at, confirmed_at,
              tx_id, confirmations, received_sats, last_polled_at
       FROM btc_invoices WHERE ref = ?`
        )
        .bind(ref)
        .first();

    if (!inv) return json({ ok: false, error: "not-found" }, { status: 404 });

    const baseResponse = (extra = {}) => ({
        ok: true,
        ref: inv.ref,
        address: inv.address,
        amountSats: inv.amount_sats,
        amountBtc: inv.amount_sats / 1e8,
        amountCad: inv.amount_cad_cents / 100,
        rateCadPerBtc: inv.rate_cad_per_btc,
        status: inv.status,
        createdAt: inv.created_at,
        expiresAt: inv.expires_at,
        firstSeenAt: inv.first_seen_at || null,
        confirmedAt: inv.confirmed_at || null,
        txId: inv.tx_id || null,
        confirmations: inv.confirmations,
        receivedSats: inv.received_sats,
        requiredConfirmations: REQUIRED_CONFIRMATIONS,
        ...extra,
    });

    // Skip polling if terminal state.
    if (inv.status === "confirmed" || inv.status === "expired" || inv.status === "cancelled") {
        return json(baseResponse());
    }

    // Expire if past deadline and unpaid.
    if (inv.status === "pending" && inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
        await db
            .prepare(`UPDATE btc_invoices SET status = 'expired' WHERE ref = ? AND status = 'pending'`)
            .bind(ref)
            .run();
        // Release the address back to the pool.
        await db
            .prepare(`UPDATE btc_address_pool SET status = 'retired' WHERE address = ?`)
            .bind(inv.address)
            .run();
        return json(baseResponse({ status: "expired" }));
    }

    // Throttle external polls.
    const lastPoll = inv.last_polled_at ? new Date(inv.last_polled_at).getTime() : 0;
    if (Date.now() - lastPoll < MIN_POLL_INTERVAL_MS) {
        return json(baseResponse({ throttled: true }));
    }

    let stats;
    try {
        stats = await fetchAddressStats(inv.address);
    } catch (e) {
        await db
            .prepare(`UPDATE btc_invoices SET last_polled_at = datetime('now') WHERE ref = ?`)
            .bind(ref)
            .run();
        return json(baseResponse({ pollError: e.message }));
    }

    const chainReceived = Number(stats?.chain_stats?.funded_txo_sum) || 0;
    const mempoolReceived = Number(stats?.mempool_stats?.funded_txo_sum) || 0;
    const totalReceived = chainReceived + mempoolReceived;

    let newStatus = inv.status;
    let txId = inv.tx_id;
    let confirmations = inv.confirmations;
    let firstSeenAt = inv.first_seen_at;
    let confirmedAt = inv.confirmed_at;

    if (totalReceived > 0) {
        const txs = await fetchAddressTxs(inv.address);
        // Find the first tx that pays >= amount.
        const tip = await fetchTipHeight();
        let matchedTx = null;
        let matchedConfs = 0;
        let matchedReceived = 0;
        for (const tx of txs) {
            const paidToUs = (tx.vout || [])
                .filter((o) => o.scriptpubkey_address === inv.address)
                .reduce((acc, o) => acc + (o.value || 0), 0);
            if (paidToUs >= inv.amount_sats * 0.995) {
                matchedTx = tx.txid;
                matchedReceived = paidToUs;
                matchedConfs = tx.status?.confirmed && tip ? Math.max(0, tip - tx.status.block_height + 1) : 0;
                break;
            }
        }

        if (matchedTx) {
            txId = matchedTx;
            confirmations = matchedConfs;
            if (!firstSeenAt) firstSeenAt = new Date().toISOString();
            if (matchedConfs >= REQUIRED_CONFIRMATIONS) {
                newStatus = "confirmed";
                if (!confirmedAt) confirmedAt = new Date().toISOString();
            } else {
                newStatus = "seen";
            }
        }
    }

    await db
        .prepare(
            `UPDATE btc_invoices
       SET status = ?, tx_id = ?, confirmations = ?, received_sats = ?,
           first_seen_at = ?, confirmed_at = ?, last_polled_at = datetime('now')
       WHERE ref = ?`
        )
        .bind(newStatus, txId || "", confirmations, totalReceived, firstSeenAt || "", confirmedAt || "", ref)
        .run();

    if (newStatus === "confirmed") {
        await db
            .prepare(`UPDATE btc_address_pool SET status = 'spent' WHERE address = ?`)
            .bind(inv.address)
            .run();
    }

    return json(
        baseResponse({
            status: newStatus,
            txId: txId || null,
            confirmations,
            receivedSats: totalReceived,
            firstSeenAt: firstSeenAt || null,
            confirmedAt: confirmedAt || null,
        })
    );
}

export const onRequest = ({ request, env }) => {
    const m = request.method.toUpperCase();
    if (m === "GET") return onRequestGet({ request, env });
    if (m === "OPTIONS") return onOptions("GET,OPTIONS");
    return methodNotAllowed("GET,OPTIONS");
};
