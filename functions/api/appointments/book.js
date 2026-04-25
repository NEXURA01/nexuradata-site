// POST /api/appointments/book
// Books a slot, returns { ok, ref, confirmUrl }. Sends confirmation email via Resend.
import { json, methodNotAllowed, onOptions, parsePayload } from "../../_lib/http.js";
import { checkRateLimit, tooManyRequests } from "../../_lib/rate-limit.js";

const SLOTS = new Set(["09:00", "10:30", "12:00", "13:30", "15:00", "16:30"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const norm = (v, max = 200) => `${v == null ? "" : v}`.trim().slice(0, max);

const genRef = () => {
    const buf = new Uint8Array(8);
    crypto.getRandomValues(buf);
    let out = "RDV-";
    for (const b of buf) out += REF_CHARS[b % REF_CHARS.length];
    return out;
};

const escapeHtml = (v) =>
    `${v == null ? "" : v}`
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const sendBookingEmail = async (env, locale, to, ref, slotDate, slotTime, name) => {
    const apiKey = env?.RESEND_API_KEY;
    const from = env?.RESEND_FROM_EMAIL;
    if (!apiKey || !from) return { sent: false, reason: "not-configured" };

    const isFr = locale === "fr";
    const subject = isFr
        ? `Confirmation rendez-vous NEXURA DATA · ${ref}`
        : `NEXURA DATA appointment confirmation · ${ref}`;
    const intro = isFr
        ? `Bonjour ${escapeHtml(name)},<br><br>Votre rendez-vous au laboratoire NEXURA DATA est confirmé.`
        : `Hello ${escapeHtml(name)},<br><br>Your appointment at the NEXURA DATA lab is confirmed.`;
    const labelDate = isFr ? "Date" : "Date";
    const labelTime = isFr ? "Heure" : "Time";
    const labelRef = isFr ? "Référence" : "Reference";
    const addr = isFr
        ? "Adresse&nbsp;: Longueuil, QC (l'adresse exacte vous est transmise par retour de courriel après vérification du créneau)."
        : "Address: Longueuil, QC (exact address is sent in a follow-up email after slot verification).";
    const cancel = isFr
        ? "Pour annuler ou reporter, répondez à ce courriel ou écrivez à dossiers@nexuradata.ca."
        : "To cancel or reschedule, reply to this email or write to dossiers@nexuradata.ca.";

    const html = `<div style="font-family:'IBM Plex Sans',Arial,sans-serif;color:#0d0d0b;background:#e8e4dc;padding:24px;border-radius:1rem 1rem 1rem 0.35rem;max-width:560px">
    <p style="margin:0 0 16px">${intro}</p>
    <p style="margin:0 0 8px"><strong>${labelDate}&nbsp;:</strong> ${escapeHtml(slotDate)}<br>
       <strong>${labelTime}&nbsp;:</strong> ${escapeHtml(slotTime)}<br>
       <strong>${labelRef}&nbsp;:</strong> <code>${escapeHtml(ref)}</code></p>
    <p style="margin:16px 0 8px">${addr}</p>
    <p style="margin:8px 0">${cancel}</p>
    <hr style="border:none;border-top:1px solid #c4b8a8;margin:20px 0">
    <p style="margin:0;font-size:12px;color:#1c1c19">NEXURA DATA · Longueuil, QC · contact@nexuradata.ca</p>
  </div>`;

    const text = isFr
        ? `Rendez-vous confirmé\n\nDate : ${slotDate}\nHeure : ${slotTime}\nRéférence : ${ref}\n\n${addr.replace(/&nbsp;/g, " ")}\n\n${cancel}\n\nNEXURA DATA · Longueuil, QC`
        : `Appointment confirmed\n\nDate: ${slotDate}\nTime: ${slotTime}\nReference: ${ref}\n\n${addr}\n\n${cancel}\n\nNEXURA DATA · Longueuil, QC`;

    try {
        const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "content-type": "application/json",
                "Idempotency-Key": `appt-${ref}`
            },
            body: JSON.stringify({ from, to, subject, html, text })
        });
        if (!r.ok) return { sent: false, reason: `api-${r.status}` };
        return { sent: true };
    } catch {
        return { sent: false, reason: "network" };
    }
};

export const onRequestOptions = () => onOptions("POST, OPTIONS");

export const onRequestPost = async (context) => {
    const limit = checkRateLimit(context.request, 5);
    if (!limit.allowed) return tooManyRequests(limit.retryAfter);

    if (!context.env?.INTAKE_DB) {
        return json({ ok: false, message: "Service indisponible." }, { status: 503 });
    }

    let payload;
    try {
        payload = await parsePayload(context.request);
    } catch {
        return json({ ok: false, message: "Requête invalide." }, { status: 400 });
    }

    // Honeypot
    if (norm(payload?.website || payload?.url || "")) {
        return json({ ok: true, ref: "RDV-XXXXXXXX" });
    }

    const slotDate = norm(payload?.slotDate, 10);
    const slotTime = norm(payload?.slotTime, 5);
    const name = norm(payload?.name, 100);
    const email = norm(payload?.email, 200).toLowerCase();
    const phone = norm(payload?.phone, 40);
    const locale = norm(payload?.locale, 4) === "en" ? "en" : "fr";
    const supportType = norm(payload?.supportType, 80);
    const notes = norm(payload?.notes, 1000);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(slotDate)) {
        return json({ ok: false, message: "Date invalide." }, { status: 400 });
    }
    if (!SLOTS.has(slotTime)) {
        return json({ ok: false, message: "Heure invalide." }, { status: 400 });
    }
    if (!name || name.length < 2) {
        return json({ ok: false, message: locale === "fr" ? "Nom requis." : "Name required." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
        return json({ ok: false, message: locale === "fr" ? "Courriel invalide." : "Invalid email." }, { status: 400 });
    }

    // Check the slot is in the future and not Sunday
    const now = new Date();
    const slotDateObj = new Date(`${slotDate}T${slotTime}:00Z`);
    if (slotDateObj.getTime() < now.getTime()) {
        return json({ ok: false, message: locale === "fr" ? "Créneau passé." : "Slot in the past." }, { status: 400 });
    }
    if (slotDateObj.getUTCDay() === 0) {
        return json({ ok: false, message: locale === "fr" ? "Fermé le dimanche." : "Closed on Sunday." }, { status: 400 });
    }

    const ref = genRef();
    const ip = context.request.headers.get("CF-Connecting-IP") || "";
    const ua = (context.request.headers.get("User-Agent") || "").slice(0, 250);

    try {
        await context.env.INTAKE_DB.prepare(
            `INSERT INTO appointments
        (ref, slot_date, slot_time, name, email, phone, locale, support_type, notes, status, consent_ip, consent_ua)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
        ).bind(ref, slotDate, slotTime, name, email, phone, locale, supportType, notes, ip, ua).run();
    } catch (e) {
        // Slot already taken (unique index conflict)
        return json({
            ok: false,
            conflict: true,
            message: locale === "fr"
                ? "Ce créneau vient d'être réservé. Choisissez-en un autre."
                : "That slot was just booked. Please pick another."
        }, { status: 409 });
    }

    // Best-effort email; never fail the booking if email fails
    await sendBookingEmail(context.env, locale, email, ref, slotDate, slotTime, name);

    return json({
        ok: true,
        ref,
        slotDate,
        slotTime,
        message: locale === "fr"
            ? "Rendez-vous enregistré. Confirmation envoyée par courriel."
            : "Appointment booked. Confirmation sent by email."
    });
};

export const onRequest = methodNotAllowed;
