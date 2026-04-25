/* NEXURA DATA — Dashboard cash-flow (lecture localStorage temps réel) */
(function () {
    "use strict";

    var INVOICES_KEY = "nxd_unpaid_invoices";
    var SESSION_KEY = "nxd_session_log";
    var PAID_KEY = "nxd_paid_invoices"; // archive locale ajoutée ici

    function fmtCAD(n) {
        return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n || 0);
    }
    function load(key) {
        try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) { return []; }
    }
    function daysAgo(dateStr) {
        var d = new Date(dateStr);
        return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
    }
    function set(sel, txt) {
        var n = document.querySelector('[data-k="' + sel + '"]');
        if (n) n.textContent = txt;
    }

    function render() {
        var invoices = load(INVOICES_KEY);
        var sessions = load(SESSION_KEY);
        var paid = load(PAID_KEY);

        // KPIs
        var ar = invoices.reduce(function (s, i) { return s + (i.amount || 0); }, 0);
        var overdue = invoices.filter(function (i) { return daysAgo(i.date) >= 7; });
        var critical = invoices.filter(function (i) { return daysAgo(i.date) >= 14; });
        var avg = invoices.length ? ar / invoices.length : 0;
        var dso = invoices.length
            ? Math.round(invoices.reduce(function (s, i) { return s + daysAgo(i.date); }, 0) / invoices.length)
            : 0;

        set("ar", fmtCAD(ar));
        set("ar-count", invoices.length + (invoices.length === 1 ? " facture" : " factures"));
        set("overdue", fmtCAD(overdue.reduce(function (s, i) { return s + (i.amount || 0); }, 0)));
        set("overdue-count", overdue.length + (overdue.length === 1 ? " facture" : " factures"));
        set("critical", fmtCAD(critical.reduce(function (s, i) { return s + (i.amount || 0); }, 0)));
        set("critical-count", critical.length + (critical.length === 1 ? " facture" : " factures"));
        set("avg", fmtCAD(avg));
        set("dso", dso + " j");

        // Sessions sur 30 jours
        var cutoff = Date.now() - 30 * 86400000;
        var recentSessions = sessions.filter(function (s) {
            return s && s.timestamp && new Date(s.timestamp).getTime() >= cutoff;
        });
        set("sessions", String(recentSessions.length));
        var refs = {};
        recentSessions.forEach(function (s) { if (s.ref) refs[s.ref] = true; });
        set("sessions-sub", Object.keys(refs).length + " dossiers · 30 j");

        // Aging buckets
        var buckets = { "0-7": 0, "7-14": 0, "14-30": 0, "30+": 0 };
        invoices.forEach(function (i) {
            var d = daysAgo(i.date);
            if (d < 7) buckets["0-7"] += i.amount || 0;
            else if (d < 14) buckets["7-14"] += i.amount || 0;
            else if (d < 30) buckets["14-30"] += i.amount || 0;
            else buckets["30+"] += i.amount || 0;
        });
        var max = Math.max.apply(null, Object.keys(buckets).map(function (k) { return buckets[k]; }).concat([1]));
        Object.keys(buckets).forEach(function (k) {
            var row = document.querySelector('[data-bucket="' + k + '"]');
            if (!row) return;
            var pct = (buckets[k] / max) * 100;
            row.querySelector(".ops-aging-bar span").style.width = Math.max(2, pct) + "%";
            row.querySelector(".ops-aging-v").textContent = fmtCAD(buckets[k]);
        });

        // Top 5 créances
        var top = invoices.slice().sort(function (a, b) { return (b.amount || 0) - (a.amount || 0); }).slice(0, 5);
        var topEl = document.querySelector("[data-top5]");
        if (topEl) {
            if (!top.length) {
                topEl.innerHTML = '<li class="ops-top5-empty">Aucune cr\u00e9ance enregistr\u00e9e. Ouvre l\'outil <a href="tools.html">Relances</a>.</li>';
            } else {
                topEl.innerHTML = top.map(function (i) {
                    var d = daysAgo(i.date);
                    var tone = d >= 14 ? "stop" : d >= 7 ? "warn" : "ok";
                    return '<li class="ops-top5-row" data-tone="' + tone + '">' +
                        '<div class="ops-top5-l"><strong>' + (i.client || "—") + '</strong><span><code>' + (i.ref || "—") + '</code> · ' + d + ' j</span></div>' +
                        '<div class="ops-top5-r">' + fmtCAD(i.amount) + '</div>' +
                        '</li>';
                }).join("");
            }
        }

        // Sparkline encaissé 30 j
        var sparkEl = document.querySelector("[data-spark]");
        if (sparkEl) {
            var paidRecent = paid.filter(function (p) {
                return p && p.paidAt && new Date(p.paidAt).getTime() >= cutoff;
            });
            if (!paidRecent.length) {
                sparkEl.innerHTML = '<p class="ops-spark-empty">Pas encore de donn\u00e9es. Marque une facture comme pay\u00e9e pour commencer.</p>';
            } else {
                var byDay = {};
                for (var i = 0; i < 30; i++) {
                    var key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
                    byDay[key] = 0;
                }
                paidRecent.forEach(function (p) {
                    var k = new Date(p.paidAt).toISOString().slice(0, 10);
                    if (k in byDay) byDay[k] += p.amount || 0;
                });
                var days = Object.keys(byDay).sort();
                var maxDay = Math.max.apply(null, days.map(function (k) { return byDay[k]; }).concat([1]));
                var bars = days.map(function (k) {
                    var h = (byDay[k] / maxDay) * 100;
                    return '<div class="ops-spark-bar" style="height:' + Math.max(2, h) + '%" title="' + k + ' — ' + fmtCAD(byDay[k]) + '"></div>';
                }).join("");
                var total = paidRecent.reduce(function (s, p) { return s + (p.amount || 0); }, 0);
                sparkEl.innerHTML = '<div class="ops-spark-total">' + fmtCAD(total) + '<span> sur 30 j</span></div><div class="ops-spark-chart">' + bars + '</div>';
            }
        }
    }

    document.addEventListener("DOMContentLoaded", render);
    window.addEventListener("storage", render);
    setInterval(render, 5000);
})();
