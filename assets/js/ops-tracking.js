/**
 * NEXURADATA — Console interne · Analytics conversions
 * Charge /api/ops/track-stats et hydrate la page tracking.html.
 */
(() => {
    "use strict";

    const root = document.querySelector("[data-track-live]");
    if (!root) return;

    const statusEl = root.querySelector("[data-track-status]");
    const daysSelect = root.querySelector("[data-track-days]");
    const refreshBtn = root.querySelector("[data-track-refresh]");
    const sparkEl = root.querySelector("[data-t-spark]");
    const recentEl = root.querySelector("[data-t-recent]");

    const fmtNum = new Intl.NumberFormat("fr-CA");
    const fmtDate = new Intl.DateTimeFormat("fr-CA", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC"
    });

    const setStatus = (text, kind) => {
        if (!statusEl) return;
        statusEl.textContent = text;
        statusEl.dataset.kind = kind || "";
    };

    const setKpi = (key, value) => {
        const node = root.querySelector(`[data-t="${key}"]`);
        if (node) node.textContent = fmtNum.format(value || 0);
    };

    const renderList = (key, items, labelFn) => {
        const ul = root.querySelector(`[data-t-list="${key}"]`);
        if (!ul) return;
        if (!items || items.length === 0) {
            ul.innerHTML = '<li class="ops-pipeline-empty">Aucune donnée</li>';
            return;
        }
        const max = items[0].count || 1;
        ul.innerHTML = items
            .map((item) => {
                const pct = Math.max(2, Math.round((item.count / max) * 100));
                const label = labelFn(item);
                return `<li>
          <span class="ops-pipeline-label">${label}</span>
          <span class="ops-pipeline-bar"><span style="width:${pct}%"></span></span>
          <span class="ops-pipeline-count">${fmtNum.format(item.count)}</span>
        </li>`;
            })
            .join("");
    };

    const escape = (s) => String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const truncate = (s, n) => {
        const str = String(s || "");
        return str.length > n ? str.slice(0, n - 1) + "…" : str;
    };

    const renderSpark = (buckets) => {
        if (!sparkEl) return;
        if (!buckets || buckets.length === 0) {
            sparkEl.innerHTML = '<p class="ops-pipeline-empty">Aucune activité 24 h</p>';
            return;
        }
        const max = buckets.reduce((m, b) => Math.max(m, b.count), 1);
        sparkEl.innerHTML = buckets
            .map((b) => {
                const h = Math.max(4, Math.round((b.count / max) * 100));
                const hour = b.bucket.slice(11, 13);
                return `<span class="ops-spark-bar" style="height:${h}%" title="${b.bucket} → ${b.count}">
          <em>${hour}h</em>
          <strong>${b.count}</strong>
        </span>`;
            })
            .join("");
    };

    const renderRecent = (rows) => {
        if (!recentEl) return;
        if (!rows || rows.length === 0) {
            recentEl.innerHTML = '<tr><td colspan="5" class="ops-out-empty">Aucun event</td></tr>';
            return;
        }
        recentEl.innerHTML = rows
            .map((r) => {
                const when = r.created_at ? fmtDate.format(new Date(r.created_at)) : "—";
                return `<tr>
          <td>${escape(when)}</td>
          <td><code>${escape(r.event)}</code></td>
          <td>${escape(truncate(r.path, 38))}</td>
          <td>${escape(truncate(r.label, 24))}</td>
          <td>${escape(r.country || "—")}</td>
        </tr>`;
            })
            .join("");
    };

    const load = async () => {
        setStatus("Chargement…", "loading");
        const days = parseInt(daysSelect?.value, 10) || 7;
        try {
            const res = await fetch(`/api/ops/track-stats?days=${days}`, {
                credentials: "same-origin",
                headers: { Accept: "application/json" }
            });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            if (!data?.ok) {
                throw new Error(data?.error || "unknown-error");
            }
            const t = data.totals || {};
            setKpi("events", t.events);
            setKpi("events_24h", t.events_24h);
            setKpi("unique_visitors", t.unique_visitors);
            setKpi("call_clicks", t.call_clicks);
            renderList("by_event", data.by_event, (i) => `<code>${escape(i.event)}</code>`);
            renderList("by_path", data.by_path, (i) => escape(truncate(i.path || "(racine)", 36)));
            renderList("by_locale", data.by_locale, (i) => escape(i.locale.toUpperCase()));
            renderList("by_country", data.by_country, (i) => escape(i.country));
            renderList("by_referrer", data.by_referrer, (i) => escape(truncate(i.referrer, 38)));
            renderSpark(data.hourly_24h);
            renderRecent(data.recent);
            setStatus(`OK · ${fmtNum.format(t.events || 0)} events sur ${days} j`, "ok");
        } catch (err) {
            setStatus(`Erreur · ${err.message}`, "error");
        }
    };

    daysSelect?.addEventListener("change", load);
    refreshBtn?.addEventListener("click", load);
    load();
    // Auto-refresh chaque 60 s
    setInterval(load, 60000);
})();
