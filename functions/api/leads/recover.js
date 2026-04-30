// POST /api/leads/recover
// Operator-only (header x-ops-secret = ACCESS_CODE_SECRET).
// Finds leads captured >24h ago that never converted, sends a single win-back email,
// marks recovery_sent_at. Idempotent (max 1 email per lead).
// Optional body: { dryRun?: bool, maxAgeDays?: number, batch?: number }
import { json, methodNotAllowed, onOptions, parsePayload } from "../../_lib/http.js";

const escapeHtml = (v) =>
    `${v == null ? "" : v}`
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function buildEmail(env, lead) {
    const isFr = lead.locale !== "en";
    const origin = env?.PUBLIC_SITE_ORIGIN || "https://nexuradata.ca";
    const greeting = lead.name
        ? (isFr ? `Bonjour ${lead.name},` : `Hello ${lead.name},`)
        : (isFr ? "Bonjour," : "Hello,");
    const intro = isFr
        ? `Vous avez consulté une estimation chez NEXURA DATA il y a 24 heures sans donner suite. C'est tout à fait normal — la perte de données est rarement une décision facile à prendre seul.`
        : `You requested a quote from NEXURA DATA 24 hours ago without moving forward. That's perfectly fine — data loss is rarely an easy decision to make alone.`;
    const offer = isFr
        ? `Notre laboratoire à Longueuil propose une <strong>évaluation gratuite sans engagement</strong>. Vous nous remettez le support, on vous envoie un diagnostic chiffré sous 24-72 h, et c'est vous qui décidez ensuite si la récupération vaut la peine.`
        : `Our Longueuil lab offers a <strong>free no-obligation assessment</strong>. Drop off the device, we send you a quoted diagnosis within 24-72 h, and you then decide whether recovery is worth it.`;
    const cta1Url = `${origin}${isFr ? "" : "/en"}/reserver-creneau-laboratoire.html`;
    const cta1Label = isFr ? "Réserver un créneau de dépôt" : "Book a drop-off slot";
    const cta2Url = `${origin}${isFr ? "" : "/en"}/#contact`;
    const cta2Label = isFr ? "Ouvrir un dossier" : "Open a case";
    const why = isFr
        ? [
            "Aucun frais si la récupération échoue (pas de récupération, pas de paiement).",
            "Salle de travail propre, journalisation complète, chaîne de possession.",
            "Loi 25 / Québec — vos données restent au Canada.",
            "Conseil franc&nbsp;: si ce n'est pas récupérable, on vous le dit dès le diagnostic."
        ]
        : [
            "No fee if recovery fails (no recovery, no payment).",
            "Clean workspace, full logging, chain of custody.",
            "Quebec Law 25 — your data stays in Canada.",
            "Honest advice: if it's not recoverable, we tell you at the diagnosis stage."
        ];
    const subject = isFr
        ? "Votre estimation chez NEXURA DATA — on peut continuer si vous voulez"
        : "Your NEXURA DATA quote — we can keep going if you'd like";
    const unsubUrl = `${origin}/api/leads/unsubscribe?email=${encodeURIComponent(lead.email)}&t=${encodeURIComponent(lead.captured_at)}`;
    const unsubLabel = isFr ? "Se désinscrire de ces relances" : "Unsubscribe from these reminders";
    const closing = isFr
        ? "Pour toute question, répondez simplement à ce courriel."
        : "Reply to this email if you have any question.";
    const sig = isFr
        ? "NEXURA DATA — Laboratoire de récupération de données et forensique numérique<br>Longueuil, Québec · contact@nexuradata.ca"
        : "NEXURA DATA — Data recovery and digital forensics lab<br>Longueuil, Quebec · contact@nexuradata.ca";

    const html = `<div style="font-family:'IBM Plex Sans',Arial,sans-serif;color:#0d0d0b;background:#e8e4dc;padding:28px;border-radius:1rem 1rem 1rem 0.35rem;max-width:600px">
    <p style="margin:0 0 16px;font-size:16px"><strong>${escapeHtml(greeting)}</strong></p>
    <p style="margin:0 0 16px;line-height:1.55">${intro}</p>
    <p style="margin:0 0 16px;line-height:1.55">${offer}</p>
    <ul style="margin:0 0 20px;padding-left:18px;line-height:1.6">
      ${why.map((w) => `<li>${w}</li>`).join("")}
    </ul>
    <p style="margin:0 0 8px">
      <a href="${cta1Url}" style="display:inline-block;padding:10px 18px;background:#0d0d0b;color:#e8e4dc;border-radius:1rem 1rem 1rem 0.35rem;text-decoration:none;font-weight:600;margin-right:8px">${cta1Label}</a>
      <a href="${cta2Url}" style="display:inline-block;padding:10px 18px;background:transparent;color:#0d0d0b;border:1px solid #0d0d0b;border-radius:1rem 1rem 1rem 0.35rem;text-decoration:none;font-weight:600">${cta2Label}</a>
    </p>
    <p style="margin:24px 0 8px;line-height:1.55">${closing}</p>
    <hr style="border:none;border-top:1px solid #c4b8a8;margin:20px 0">
    <p style="margin:0 0 6px;font-size:12px;color:#1c1c19">${sig}</p>
    <p style="margin:8px 0 0;font-size:11px;color:#1c1c19;opacity:.75">
      <a href="${unsubUrl}" style="color:#1c1c19">${unsubLabel}</a>
    </p>
  </div>`;

    const txtLines = [
        greeting,
        "",
        isFr
            ? "Vous avez consulté une estimation chez NEXURA DATA il y a 24 heures sans donner suite."
            : "You requested a NEXURA DATA quote 24 hours ago without moving forward.",
        "",
        isFr
            ? "Notre laboratoire à Longueuil propose une évaluation gratuite sans engagement."
            : "Our Longueuil lab offers a free no-obligation assessment.",
        "",
        ...why.map((w) => "- " + w.replace(/&nbsp;/g, " ").replace(/[<>]/g, "")),
        "",
        cta1Label + " : " + cta1Url,
        cta2Label + " : " + cta2Url,
        "",
        closing,
        "",
        "NEXURA DATA · Longueuil, QC · contact@nexuradata.ca",
        unsubLabel + " : " + unsubUrl,
    ];

    return { subject, html, text: txtLines.join("\n") };
}

async function sendOne(env, lead) {
    const apiKey = env?.RESEND_API_KEY;
    const from = env?.RESEND_FROM_EMAIL;
    if (!apiKey || !from) return { sent: false, reason: "resend-not-configured" };
    const { subject, html, text } = buildEmail(env, lead);
    try {
        const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: "Bearer " + apiKey,
                "Idempotency-Key": "lead-recovery-" + lead.id,
            },
            body: JSON.stringify({ from, to: lead.email, subject, html, text }),
        });
        if (!r.ok) {
            const body = await r.text().catch(() => "");
            return { sent: false, reason: "resend-" + r.status, body: body.slice(0, 200) };
        }
        return { sent: true };
    } catch (e) {
        return { sent: false, reason: "fetch-error", error: e.message };
    }
}

export const onRequestOptions = () => onOptions("POST,OPTIONS");

export async function onRequestPost({ request, env }) {
    const expected = env?.ACCESS_CODE_SECRET;
    if (!expected) return json({ ok: false, error: "ops-secret-not-configured" }, { status: 503 });
    const provided = request.headers.get("x-ops-secret") || "";
    if (provided !== expected) return json({ ok: false, error: "unauthorized" }, { status: 401 });

    const db = env?.INTAKE_DB;
    if (!db) return json({ ok: false, error: "db-not-configured" }, { status: 503 });

    const payload = (await parsePayload(request)) || {};
    const dryRun = !!payload.dryRun;
    const maxAgeDays = Math.min(30, Math.max(1, Number(payload.maxAgeDays) || 14));
    const batch = Math.min(100, Math.max(1, Number(payload.batch) || 25));

    // Eligible: captured > 24h ago, < maxAgeDays ago, no recovery yet, no conversion, not unsubscribed.
    const candidates = await db
        .prepare(
            `SELECT id, email, name, locale, captured_at, source, device, issue, urgency,
              estimate_min_cad, estimate_max_cad
       FROM lead_captures
       WHERE recovery_sent_at = ''
         AND converted_at = ''
         AND unsubscribed_at = ''
         AND captured_at < datetime('now', '-1 day')
         AND captured_at > datetime('now', ?)
       ORDER BY captured_at ASC
       LIMIT ?`
        )
        .bind(`-${maxAgeDays} day`, batch)
        .all();

    const rows = candidates?.results || [];
    if (dryRun) {
        return json({ ok: true, dryRun: true, eligible: rows.length, sample: rows.slice(0, 5) });
    }

    let sent = 0;
    let skipped = 0;
    const failures = [];

    for (const lead of rows) {
        // Re-check unsubscribe just before send.
        const u = await db
            .prepare(`SELECT email FROM email_unsubscribes WHERE email = ?`)
            .bind(lead.email)
            .first();
        if (u) {
            await db
                .prepare(`UPDATE lead_captures SET unsubscribed_at = datetime('now') WHERE id = ?`)
                .bind(lead.id)
                .run();
            skipped++;
            continue;
        }

        // Check if they opened a case in the meantime (same email).
        const conv = await db
            .prepare(
                `SELECT case_id FROM cases WHERE lower(courriel) = lower(?) ORDER BY created_at DESC LIMIT 1`
            )
            .bind(lead.email)
            .first()
            .catch(() => null);
        if (conv?.case_id) {
            await db
                .prepare(
                    `UPDATE lead_captures SET converted_at = datetime('now'), converted_case_id = ? WHERE id = ?`
                )
                .bind(conv.case_id, lead.id)
                .run();
            skipped++;
            continue;
        }

        const res = await sendOne(env, lead);
        if (res.sent) {
            await db
                .prepare(
                    `UPDATE lead_captures SET recovery_sent_at = datetime('now'), recovery_count = recovery_count + 1 WHERE id = ?`
                )
                .bind(lead.id)
                .run();
            sent++;
        } else {
            failures.push({ id: lead.id, email: lead.email, reason: res.reason });
        }
    }

    return json({ ok: true, eligible: rows.length, sent, skipped, failures });
}

export const onRequest = ({ request, env }) => {
    const m = request.method.toUpperCase();
    if (m === "POST") return onRequestPost({ request, env });
    if (m === "OPTIONS") return onOptions("POST,OPTIONS");
    return methodNotAllowed("POST,OPTIONS");
};
