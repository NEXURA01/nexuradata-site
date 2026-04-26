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
    const days = Math.max(1, Math.min(90, parseInt(url.searchParams.get("days"), 10) || 7));
    const sinceMs = Date.now() - days * 86400000;
    const sinceIso = new Date(sinceMs).toISOString();
    const last24Iso = new Date(Date.now() - 86400000).toISOString();
    const db = env.INTAKE_DB;

    const totalRow = await safe(
        db
            .prepare("SELECT COUNT(*) AS total FROM tracking_events WHERE created_at >= ?")
            .bind(sinceIso)
            .first(),
        { total: 0 }
    );

    const last24Row = await safe(
        db
            .prepare("SELECT COUNT(*) AS total FROM tracking_events WHERE created_at >= ?")
            .bind(last24Iso)
            .first(),
        { total: 0 }
    );

    const uniqueRow = await safe(
        db
            .prepare(
                "SELECT COUNT(DISTINCT ip_hash) AS uniques FROM tracking_events WHERE created_at >= ? AND ip_hash <> ''"
            )
            .bind(sinceIso)
            .first(),
        { uniques: 0 }
    );

    const callsRow = await safe(
        db
            .prepare(
                "SELECT COUNT(*) AS calls FROM tracking_events WHERE created_at >= ? AND event IN ('call-link','call-header')"
            )
            .bind(sinceIso)
            .first(),
        { calls: 0 }
    );

    const eventsResult = await safe(
        db
            .prepare(
                "SELECT event, COUNT(*) AS count FROM tracking_events WHERE created_at >= ? GROUP BY event ORDER BY count DESC LIMIT 12"
            )
            .bind(sinceIso)
            .all(),
        { results: [] }
    );

    const pathsResult = await safe(
        db
            .prepare(
                "SELECT path, COUNT(*) AS count FROM tracking_events WHERE created_at >= ? AND path <> '' GROUP BY path ORDER BY count DESC LIMIT 15"
            )
            .bind(sinceIso)
            .all(),
        { results: [] }
    );

    const localesResult = await safe(
        db
            .prepare(
                "SELECT locale, COUNT(*) AS count FROM tracking_events WHERE created_at >= ? AND locale <> '' GROUP BY locale ORDER BY count DESC"
            )
            .bind(sinceIso)
            .all(),
        { results: [] }
    );

    const countriesResult = await safe(
        db
            .prepare(
                "SELECT country, COUNT(*) AS count FROM tracking_events WHERE created_at >= ? AND country <> '' GROUP BY country ORDER BY count DESC LIMIT 10"
            )
            .bind(sinceIso)
            .all(),
        { results: [] }
    );

    const referrersResult = await safe(
        db
            .prepare(
                "SELECT referrer, COUNT(*) AS count FROM tracking_events WHERE created_at >= ? AND referrer <> '' GROUP BY referrer ORDER BY count DESC LIMIT 10"
            )
            .bind(sinceIso)
            .all(),
        { results: [] }
    );

    // Hourly bucket (last 24h)
    const hourlyResult = await safe(
        db
            .prepare(
                "SELECT substr(created_at, 1, 13) AS bucket, COUNT(*) AS count FROM tracking_events WHERE created_at >= ? GROUP BY bucket ORDER BY bucket ASC"
            )
            .bind(last24Iso)
            .all(),
        { results: [] }
    );

    const recentResult = await safe(
        db
            .prepare(
                "SELECT event, path, label, country, created_at FROM tracking_events ORDER BY created_at DESC LIMIT 25"
            )
            .all(),
        { results: [] }
    );

    return json({
        ok: true,
        window_days: days,
        totals: {
            events: Number(totalRow?.total || 0),
            events_24h: Number(last24Row?.total || 0),
            unique_visitors: Number(uniqueRow?.uniques || 0),
            call_clicks: Number(callsRow?.calls || 0)
        },
        by_event: (eventsResult?.results || []).map((r) => ({ event: r.event, count: Number(r.count) })),
        by_path: (pathsResult?.results || []).map((r) => ({ path: r.path, count: Number(r.count) })),
        by_locale: (localesResult?.results || []).map((r) => ({ locale: r.locale, count: Number(r.count) })),
        by_country: (countriesResult?.results || []).map((r) => ({ country: r.country, count: Number(r.count) })),
        by_referrer: (referrersResult?.results || []).map((r) => ({ referrer: r.referrer, count: Number(r.count) })),
        hourly_24h: (hourlyResult?.results || []).map((r) => ({ bucket: r.bucket, count: Number(r.count) })),
        recent: (recentResult?.results || []).map((r) => ({
            event: r.event,
            path: r.path,
            label: r.label,
            country: r.country,
            created_at: r.created_at
        }))
    });
};

export const onRequest = async (context) => {
    const method = context.request.method;
    if (method === "OPTIONS") return onRequestOptions();
    if (method === "GET") return onRequestGet(context);
    return methodNotAllowed("GET, OPTIONS");
};
