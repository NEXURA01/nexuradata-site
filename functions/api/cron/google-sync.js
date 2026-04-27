// functions/api/cron/google-sync.js
//
// Daily Google sync worker (Search Console + Google Business Profile).
// Triggered by Cloudflare cron OR manual GET (Cf Access protected).
//
// REQUIRED SECRETS (set via `wrangler pages secret put`):
//   GOOGLE_OAUTH_CLIENT_ID       OAuth 2.0 client id (from console.cloud.google.com)
//   GOOGLE_OAUTH_CLIENT_SECRET   OAuth 2.0 client secret
//   GOOGLE_OAUTH_REFRESH_TOKEN   Long-lived refresh token (generated once via human OAuth flow)
//   GOOGLE_GBP_LOCATION_NAME     e.g. "accounts/12345/locations/67890" (from GBP API)
//   GOOGLE_GSC_SITE_URL          e.g. "https://nexuradata.ca/" (must be GSC-verified)
//
// SCOPES the refresh token must cover:
//   https://www.googleapis.com/auth/webmasters
//   https://www.googleapis.com/auth/business.manage
//
// One-time setup (humain, ~10 min):
//   1. console.cloud.google.com → New project "nexuradata-ops"
//   2. APIs enabled: Search Console, My Business Business Information, Account Mgmt
//   3. OAuth consent screen → External, add admin@nexuradata.ca as test user
//   4. Credentials → OAuth 2.0 Client ID type "Desktop app" (or "Web" with redirect localhost)
//   5. Run scripts/google-oauth-bootstrap.mjs locally → outputs refresh token
//   6. wrangler pages secret put GOOGLE_OAUTH_REFRESH_TOKEN

import { authorizeOpsRequest } from '../../_lib/cases.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GSC_URL = 'https://searchconsole.googleapis.com/webmasters/v3';
const GBP_URL = 'https://mybusiness.googleapis.com/v4'; // legacy posts endpoint
const GBP_INFO_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1';

async function getAccessToken(env) {
    const body = new URLSearchParams({
        client_id: env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
        refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN,
        grant_type: 'refresh_token'
    });
    const r = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });
    if (!r.ok) throw new Error(`oauth_refresh_failed:${r.status}:${await r.text()}`);
    const j = await r.json();
    return j.access_token;
}

async function submitSitemap(token, siteUrl, sitemapUrl) {
    const u = `${GSC_URL}/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
    const r = await fetch(u, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
    });
    return { ok: r.ok, status: r.status };
}

async function fetchTopQueries(token, siteUrl, days = 7) {
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const fmt = (d) => d.toISOString().slice(0, 10);
    const r = await fetch(`${GSC_URL}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            startDate: fmt(start),
            endDate: fmt(end),
            dimensions: ['query'],
            rowLimit: 50
        })
    });
    if (!r.ok) return { ok: false, status: r.status, error: await r.text() };
    const j = await r.json();
    return { ok: true, rows: j.rows || [] };
}

async function publishGbpPost(token, locationName, summary, ctaUrl) {
    if (!locationName) return { skipped: 'no_location' };
    const r = await fetch(`${GBP_URL}/${locationName}/localPosts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            languageCode: 'fr',
            summary,
            callToAction: { actionType: 'LEARN_MORE', url: ctaUrl },
            topicType: 'STANDARD'
        })
    });
    return { ok: r.ok, status: r.status, body: r.ok ? null : await r.text() };
}

async function recordRun(env, payload) {
    if (!env.INTAKE_DB) return;
    try {
        await env.INTAKE_DB.prepare(
            'INSERT INTO ops_log (kind, payload_json, created_at) VALUES (?,?,?)'
        ).bind('google_sync', JSON.stringify(payload), new Date().toISOString()).run();
    } catch {
        // table optional; ignore
    }
}

export async function runGoogleSync(env) {
    const result = { startedAt: new Date().toISOString(), steps: {} };
    try {
        const token = await getAccessToken(env);
        result.steps.token = 'ok';

        if (env.GOOGLE_GSC_SITE_URL) {
            result.steps.sitemap = await submitSitemap(
                token,
                env.GOOGLE_GSC_SITE_URL,
                `${env.GOOGLE_GSC_SITE_URL.replace(/\/$/, '')}/sitemap.xml`
            );
            result.steps.queries = await fetchTopQueries(token, env.GOOGLE_GSC_SITE_URL, 7);
        }

        if (env.GOOGLE_GBP_LOCATION_NAME) {
            const today = new Date().toISOString().slice(0, 10);
            result.steps.gbpPost = await publishGbpPost(
                token,
                env.GOOGLE_GBP_LOCATION_NAME,
                `Mise à jour ${today} — Laboratoire NEXURADATA actif aujourd'hui pour récupération de données et forensique numérique à Montréal et la Rive-Sud.`,
                'https://nexuradata.ca/'
            );
        }

        result.ok = true;
    } catch (e) {
        result.ok = false;
        result.error = String(e?.message || e);
    }
    result.finishedAt = new Date().toISOString();
    await recordRun(env, result);
    return result;
}

export async function onRequestGet({ request, env }) {
    const auth = authorizeOpsRequest(request, env);
    if (!auth.ok) return new Response(JSON.stringify({ ok: false, error: auth.error || 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
    });
    const result = await runGoogleSync(env);
    return new Response(JSON.stringify(result, null, 2), {
        status: result.ok ? 200 : 500,
        headers: { 'Content-Type': 'application/json' }
    });
}

// Cloudflare Pages Functions does not yet expose `scheduled` — to enable
// daily auto-run, add a Cron Trigger in Cloudflare dashboard pointing to
// GET /api/cron/google-sync (with appropriate Cf Access service token), or
// migrate this to a dedicated Worker with `scheduled` handler.
