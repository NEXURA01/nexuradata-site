import { authorizeOpsRequest } from "../../_lib/cases.js";
import { json, methodNotAllowed, onOptions } from "../../_lib/http.js";

export const onRequestOptions = () => onOptions("GET, OPTIONS");

const safe = async (promise, fallback) => {
    try {
        return await promise;
    } catch {
        return fallback;
    }
};

const ymd = (d) => d.toISOString().slice(0, 10);

export const onRequestGet = async (context) => {
    const { env, request } = context;
    if (!env?.INTAKE_DB) {
        return json({ ok: false, error: "service-unavailable" }, { status: 503 });
    }

    const auth = authorizeOpsRequest(request, env);
    if (!auth.ok) {
        return json({ ok: false, error: "unauthorized" }, { status: 403 });
    }

    const url = new URL(request.url);
    const days = Math.max(7, Math.min(180, parseInt(url.searchParams.get("days"), 10) || 30));

    const now = new Date();
    const sinceDate = new Date(now.getTime() - days * 86400000);
    const sinceIso = sinceDate.toISOString();
    const since30 = new Date(now.getTime() - 30 * 86400000).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

    const db = env.INTAKE_DB;

    // ─── Stripe revenue (CAD cents) ────────────────────────────────────
    const revenue = await safe(
        db
            .prepare(
                `SELECT
           COALESCE(SUM(CASE WHEN paid_at >= ? THEN amount_cents ELSE 0 END), 0) AS today_cents,
           COALESCE(SUM(CASE WHEN paid_at >= ? THEN amount_cents ELSE 0 END), 0) AS month_cents,
           COALESCE(SUM(CASE WHEN paid_at >= ? THEN amount_cents ELSE 0 END), 0) AS year_cents,
           COALESCE(SUM(CASE WHEN paid_at >= ? THEN amount_cents ELSE 0 END), 0) AS window_cents,
           COUNT(CASE WHEN paid_at >= ? AND paid_at <> '' THEN 1 END) AS window_count
         FROM case_payments
         WHERE status = 'paid'`
            )
            .bind(todayStart, monthStart, yearStart, sinceIso, sinceIso)
            .first(),
        { today_cents: 0, month_cents: 0, year_cents: 0, window_cents: 0, window_count: 0 }
    );

    // ─── Outstanding payments (sent but not paid) ──────────────────────
    const outstanding = await safe(
        db
            .prepare(
                `SELECT COUNT(*) AS n, COALESCE(SUM(amount_cents), 0) AS cents
         FROM case_payments
         WHERE status IN ('sent', 'pending') AND paid_at = ''`
            )
            .first(),
        { n: 0, cents: 0 }
    );

    // ─── Cases pipeline ────────────────────────────────────────────────
    const casesByStatus = await safe(
        db
            .prepare(`SELECT status, COUNT(*) AS n FROM cases GROUP BY status ORDER BY n DESC`)
            .all(),
        { results: [] }
    );

    const newCases = await safe(
        db
            .prepare(`SELECT COUNT(*) AS n FROM cases WHERE created_at >= ?`)
            .bind(sinceIso)
            .first(),
        { n: 0 }
    );

    // ─── Leads (capture funnel) ────────────────────────────────────────
    const leads = await safe(
        db
            .prepare(
                `SELECT
           COUNT(*) AS captured,
           COALESCE(SUM(CASE WHEN converted_at <> '' THEN 1 ELSE 0 END), 0) AS converted,
           COALESCE(SUM(CASE WHEN recovery_sent_at <> '' THEN 1 ELSE 0 END), 0) AS recovered,
           COALESCE(SUM(CASE WHEN unsubscribed_at <> '' THEN 1 ELSE 0 END), 0) AS unsubscribed,
           COALESCE(SUM(CASE WHEN captured_at >= ? THEN 1 ELSE 0 END), 0) AS captured_window,
           COALESCE(SUM(CASE WHEN captured_at >= ? AND converted_at <> '' THEN 1 ELSE 0 END), 0) AS converted_window
         FROM lead_captures`
            )
            .bind(sinceIso, sinceIso)
            .first(),
        { captured: 0, converted: 0, recovered: 0, unsubscribed: 0, captured_window: 0, converted_window: 0 }
    );

    const leadsPending = await safe(
        db
            .prepare(
                `SELECT COUNT(*) AS n FROM lead_captures
         WHERE recovery_sent_at = '' AND converted_at = '' AND unsubscribed_at = ''
           AND captured_at <= ? AND captured_at >= ?`
            )
            .bind(new Date(now.getTime() - 86400000).toISOString(), new Date(now.getTime() - 14 * 86400000).toISOString())
            .first(),
        { n: 0 }
    );

    // ─── BTC invoices ──────────────────────────────────────────────────
    const btc = await safe(
        db
            .prepare(
                `SELECT
           COUNT(*) AS total,
           COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
           COALESCE(SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END), 0) AS confirmed,
           COALESCE(SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END), 0) AS expired,
           COALESCE(SUM(CASE WHEN status = 'confirmed' AND created_at >= ? THEN amount_cad_cents ELSE 0 END), 0) AS window_cad_cents
         FROM btc_invoices`
            )
            .bind(sinceIso)
            .first(),
        { total: 0, pending: 0, confirmed: 0, expired: 0, window_cad_cents: 0 }
    );

    const btcPool = await safe(
        db
            .prepare(
                `SELECT
           COALESCE(SUM(CASE WHEN status = 'unused' THEN 1 ELSE 0 END), 0) AS unused,
           COALESCE(SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END), 0) AS assigned,
           COALESCE(SUM(CASE WHEN status = 'spent' THEN 1 ELSE 0 END), 0) AS spent
         FROM btc_address_pool`
            )
            .first(),
        { unused: 0, assigned: 0, spent: 0 }
    );

    // ─── Daily revenue series (window) ─────────────────────────────────
    const series = await safe(
        db
            .prepare(
                `SELECT substr(paid_at, 1, 10) AS day,
                COALESCE(SUM(amount_cents), 0) AS cents,
                COUNT(*) AS n
         FROM case_payments
         WHERE status = 'paid' AND paid_at >= ?
         GROUP BY day
         ORDER BY day ASC`
            )
            .bind(sinceIso)
            .all(),
        { results: [] }
    );

    // Fill missing days with 0
    const dayMap = new Map((series.results || []).map((r) => [r.day, { cents: r.cents, n: r.n }]));
    const dailySeries = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = ymd(new Date(now.getTime() - i * 86400000));
        const hit = dayMap.get(d);
        dailySeries.push({ day: d, cents: hit ? hit.cents : 0, n: hit ? hit.n : 0 });
    }

    // ─── Recent activity (last 10 paid + last 5 cases) ─────────────────
    const recentPaid = await safe(
        db
            .prepare(
                `SELECT case_id, label, amount_cents, paid_at
         FROM case_payments
         WHERE status = 'paid' AND paid_at <> ''
         ORDER BY paid_at DESC
         LIMIT 10`
            )
            .all(),
        { results: [] }
    );

    const recentCases = await safe(
        db
            .prepare(
                `SELECT case_id, name, support, urgency, status, created_at
         FROM cases
         ORDER BY created_at DESC
         LIMIT 5`
            )
            .all(),
        { results: [] }
    );

    return json({
        ok: true,
        generated_at: now.toISOString(),
        window_days: days,
        revenue: {
            today_cad: revenue.today_cents / 100,
            month_cad: revenue.month_cents / 100,
            year_cad: revenue.year_cents / 100,
            window_cad: revenue.window_cents / 100,
            window_count: revenue.window_count
        },
        outstanding: {
            count: outstanding.n,
            cad: outstanding.cents / 100
        },
        cases: {
            new_in_window: newCases.n,
            by_status: (casesByStatus.results || []).map((r) => ({ status: r.status, n: r.n }))
        },
        leads: {
            captured: leads.captured,
            converted: leads.converted,
            recovered: leads.recovered,
            unsubscribed: leads.unsubscribed,
            captured_window: leads.captured_window,
            converted_window: leads.converted_window,
            pending_recovery: leadsPending.n,
            conversion_rate: leads.captured > 0 ? leads.converted / leads.captured : 0
        },
        btc: {
            invoices: {
                total: btc.total,
                pending: btc.pending,
                confirmed: btc.confirmed,
                expired: btc.expired,
                window_cad: btc.window_cad_cents / 100
            },
            pool: {
                unused: btcPool.unused,
                assigned: btcPool.assigned,
                spent: btcPool.spent,
                low_warning: btcPool.unused < 20
            }
        },
        daily_revenue: dailySeries,
        recent: {
            paid: (recentPaid.results || []).map((r) => ({
                case_id: r.case_id,
                label: r.label,
                cad: r.amount_cents / 100,
                paid_at: r.paid_at
            })),
            cases: recentCases.results || []
        }
    });
};

export const onRequest = async (context) => {
    if (context.request.method === "OPTIONS") return onRequestOptions();
    if (context.request.method === "GET") return onRequestGet(context);
    return methodNotAllowed("GET, OPTIONS");
};
