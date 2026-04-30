// WhatsApp Cloud API helper: signature verification, send text, AI auto-reply.
// Reuses Workers AI binding (env.AI) — same model as the on-site chat assistant.

const MODEL = "@cf/meta/llama-3.1-8b-instruct";
const GRAPH_VERSION = "v20.0";

// Keep auto-replies short and direct on WhatsApp.
const SYSTEM_FR = `Tu es l'assistant WhatsApp de NEXURADATA, laboratoire de récupération de données et forensique numérique à Longueuil.
Téléphone: 438 813-0592. Courriel: dossiers@nexuradata.ca. Diagnostic gratuit. No data, no charge.

Règles strictes:
- Réponds en 1 à 4 phrases courtes maximum. Aucun emoji.
- Si l'utilisateur n'a pas dit son problème, pose UNE seule question (type d'appareil + symptôme).
- Donne une fourchette de prix indicative (jamais ferme): supprimés/format 79$+, externe/USB 129$+, interne/SSD 249$+, téléphone 449$+, RAID/NAS 650$+, forensique sur devis. Taxes QC en sus.
- Si bruit, eau, ne démarre plus: dire d'arrêter de brancher.
- Sujets sensibles (police, tribunal, ransomware, succession, urgence vitale): un humain prend le relais. Donne 438 813-0592.
- Ne promets jamais de récupération réussie. "Bonnes chances" oui, "garanti" jamais.
- Tu n'as pas accès aux dossiers internes. Pour suivi, redirige vers le formulaire du site nexuradata.ca/suivi.`;

const SYSTEM_EN = `You are the NEXURADATA WhatsApp assistant, data recovery and digital forensics lab in Longueuil, Quebec.
Phone: 438 813-0592. Email: dossiers@nexuradata.ca. Free assessment. No data, no charge.

Strict rules:
- Reply in 1 to 4 short sentences max. No emoji.
- If the user did not state the problem, ask ONE question only (device type + symptom).
- Give an indicative price range (never firm): deleted/format $79+, external/USB $129+, internal/SSD $249+, phone $449+, RAID/NAS $650+, forensics by quote. Quebec taxes apply.
- If noise, water, won't boot: say stop plugging it in.
- Sensitive topics (police, court, ransomware, estate, life-critical): a human takes over. Give 438 813-0592.
- Never promise a successful recovery. "Good odds" yes, "guaranteed" never.
- You have no access to internal cases. For status, redirect to the form at nexuradata.ca/suivi.`;

const ESCALATION_KEYWORDS = [
    "ransomware", "rançongiciel", "ranconciel",
    "police", "policier", "tribunal", "court", "juge", "judge",
    "avocat", "lawyer", "huissier", "subpoena", "warrant", "mandat",
    "succession", "estate", "mort", "death", "decede", "deceased",
    "menace", "threat", "perquisition",
    "urgence vitale", "life critical"
];

const PRICE_KEYWORDS = ["prix", "tarif", "coute", "coût", "cost", "price", "combien", "how much"];
const STATUS_KEYWORDS = ["statut", "suivi", "ou en est", "où en est", "status", "progress", "dossier"];

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export const sanitize = (s, max = 4000) =>
    String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, max).trim();

export const detectLocale = (text) => {
    const t = String(text || "").toLowerCase();
    // Crude FR detector: accents + common FR stop words.
    if (/[àâçéèêëîïôûùüÿœæ]/.test(t)) return "fr";
    if (/\b(le|la|les|un|une|bonjour|merci|disque|données|récupérer|récupération|téléphone|svp)\b/.test(t)) return "fr";
    if (/\b(hi|hello|the|please|drive|data|recover|recovery|phone|broken)\b/.test(t)) return "en";
    return "fr";
};

export const detectIntent = (text) => {
    const t = String(text || "").toLowerCase();
    if (ESCALATION_KEYWORDS.some((k) => t.includes(k))) return "escalation";
    if (PRICE_KEYWORDS.some((k) => t.includes(k))) return "price";
    if (STATUS_KEYWORDS.some((k) => t.includes(k))) return "status";
    return "other";
};

export const shouldEscalate = (text, autoCount) => {
    if (detectIntent(text) === "escalation") return true;
    if (Number(autoCount) >= 5) return true;
    return false;
};

// ---------------------------------------------------------------------------
// Signature verification (X-Hub-Signature-256, HMAC-SHA256 of raw body)
// ---------------------------------------------------------------------------

const hexToBytes = (hex) => {
    const clean = hex.replace(/^sha256=/, "").trim();
    if (!/^[0-9a-f]+$/i.test(clean) || clean.length % 2) return null;
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
};

const timingSafeEqual = (a, b) => {
    if (!a || !b || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
    return diff === 0;
};

export const verifySignature = async (rawBody, signatureHeader, appSecret) => {
    if (!appSecret) return false;
    if (!signatureHeader) return false;
    const expected = hexToBytes(signatureHeader);
    if (!expected) return false;

    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(appSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    return timingSafeEqual(new Uint8Array(sig), expected);
};

// ---------------------------------------------------------------------------
// Meta Cloud API
// ---------------------------------------------------------------------------

// Internal: POST any WhatsApp Cloud API payload (text, template, interactive).
const postGraphMessage = async (env, payload) => {
    const phoneId = sanitize(env?.WHATSAPP_PHONE_NUMBER_ID, 60);
    const token = sanitize(env?.WHATSAPP_ACCESS_TOKEN, 600);
    if (!phoneId || !token) {
        return { ok: false, reason: "not-configured" };
    }
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`;
    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) return { ok: false, reason: data?.error?.message || `http_${resp.status}` };
        const messageId = data?.messages?.[0]?.id || "";
        return { ok: true, messageId };
    } catch (err) {
        return { ok: false, reason: err?.message || "network" };
    }
};

export const sendWhatsAppText = async (env, toWaId, text) =>
    postGraphMessage(env, {
        messaging_product: "whatsapp",
        to: toWaId,
        type: "text",
        text: { body: sanitize(text, 4000) }
    });

// Send an approved template (only way to message > 24h after last user msg).
// components: optional array per Meta spec, e.g. [{type:"body", parameters:[{type:"text", text:"NXD-1234"}]}]
export const sendWhatsAppTemplate = async (env, toWaId, templateName, languageCode = "fr", components = []) => {
    const name = sanitize(templateName, 80);
    if (!name) return { ok: false, reason: "missing-template" };
    const template = {
        name,
        language: { code: sanitize(languageCode, 12) || "fr" }
    };
    if (Array.isArray(components) && components.length) template.components = components;
    return postGraphMessage(env, {
        messaging_product: "whatsapp",
        to: toWaId,
        type: "template",
        template
    });
};

// Send up to 3 reply buttons. buttons: [{id, title}, ...] — title <= 20 chars, id <= 256.
export const sendWhatsAppButtons = async (env, toWaId, bodyText, buttons = []) => {
    const safeBody = sanitize(bodyText, 1024);
    const trimmed = (Array.isArray(buttons) ? buttons : []).slice(0, 3)
        .map((b) => ({
            type: "reply",
            reply: {
                id: sanitize(b?.id, 256) || "btn",
                title: sanitize(b?.title, 20) || "OK"
            }
        }));
    if (!safeBody || !trimmed.length) return { ok: false, reason: "invalid-buttons" };
    return postGraphMessage(env, {
        messaging_product: "whatsapp",
        to: toWaId,
        type: "interactive",
        interactive: {
            type: "button",
            body: { text: safeBody },
            action: { buttons: trimmed }
        }
    });
};

// Send an interactive list. sections: [{title, rows:[{id,title,description?}]}]
// Up to 10 sections, 10 rows total. Row title <= 24, description <= 72.
export const sendWhatsAppList = async (env, toWaId, bodyText, buttonText, sections = []) => {
    const safeBody = sanitize(bodyText, 1024);
    const safeButton = sanitize(buttonText, 20) || "Choisir";
    const cleanSections = (Array.isArray(sections) ? sections : []).slice(0, 10)
        .map((s) => ({
            title: sanitize(s?.title, 24),
            rows: (Array.isArray(s?.rows) ? s.rows : []).slice(0, 10).map((r) => {
                const row = {
                    id: sanitize(r?.id, 200) || "row",
                    title: sanitize(r?.title, 24) || "—"
                };
                const desc = sanitize(r?.description, 72);
                if (desc) row.description = desc;
                return row;
            })
        }))
        .filter((s) => s.rows.length);
    if (!safeBody || !cleanSections.length) return { ok: false, reason: "invalid-list" };
    return postGraphMessage(env, {
        messaging_product: "whatsapp",
        to: toWaId,
        type: "interactive",
        interactive: {
            type: "list",
            body: { text: safeBody },
            action: { button: safeButton, sections: cleanSections }
        }
    });
};

// ---------------------------------------------------------------------------
// AI auto-reply (Workers AI)
// ---------------------------------------------------------------------------

export const generateAiReply = async (env, history, locale) => {
    if (!env?.AI || typeof env.AI.run !== "function") {
        return locale === "en"
            ? "Hi — for now, please call 438 813-0592 or email dossiers@nexuradata.ca. The free assessment can start right away."
            : "Bonjour — pour l'instant, appelez le 438 813-0592 ou écrivez à dossiers@nexuradata.ca. Le diagnostic gratuit peut démarrer tout de suite.";
    }
    const messages = [
        { role: "system", content: locale === "en" ? SYSTEM_EN : SYSTEM_FR },
        ...history.slice(-10).map((m) => ({
            role: m.direction === "outbound" ? "assistant" : "user",
            content: sanitize(m.body, 1500)
        }))
    ];
    try {
        const out = await env.AI.run(MODEL, { messages, max_tokens: 220, temperature: 0.3 });
        const reply = sanitize(out?.response || out?.result?.response || "", 1200);
        if (reply) return reply;
    } catch {
        // fall through
    }
    return locale === "en"
        ? "I had trouble forming a clear answer. Please call 438 813-0592 — the assessment is free."
        : "Désolé, je n'arrive pas à formuler une réponse claire. Appelez le 438 813-0592 — le diagnostic est gratuit.";
};

export const escalationMessage = (locale) =>
    locale === "en"
        ? "Thanks. A NEXURADATA examiner will reply personally. For anything urgent, call 438 813-0592."
        : "Merci. Un examinateur NEXURADATA vous répondra personnellement. Pour toute urgence, appelez le 438 813-0592.";

// ---------------------------------------------------------------------------
// D1 storage (idempotent)
// ---------------------------------------------------------------------------

export const ensureWhatsAppSchema = async (env) => {
    if (!env?.INTAKE_DB) return;
    await env.INTAKE_DB.exec(
        "CREATE TABLE IF NOT EXISTS whatsapp_threads (" +
        "wa_id TEXT PRIMARY KEY," +
        "display_name TEXT NOT NULL DEFAULT ''," +
        "locale TEXT NOT NULL DEFAULT 'fr'," +
        "status TEXT NOT NULL DEFAULT 'auto'," +
        "intent TEXT NOT NULL DEFAULT ''," +
        "case_id TEXT NOT NULL DEFAULT ''," +
        "qualification_json TEXT NOT NULL DEFAULT ''," +
        "auto_replies_count INTEGER NOT NULL DEFAULT 0," +
        "last_inbound_at TEXT," +
        "last_outbound_at TEXT," +
        "escalated_at TEXT," +
        "created_at TEXT NOT NULL DEFAULT (datetime('now'))," +
        "updated_at TEXT NOT NULL DEFAULT (datetime('now')))"
    );
    await env.INTAKE_DB.exec(
        "CREATE TABLE IF NOT EXISTS whatsapp_messages (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
        "wa_message_id TEXT NOT NULL UNIQUE," +
        "wa_id TEXT NOT NULL," +
        "direction TEXT NOT NULL," +
        "body TEXT NOT NULL DEFAULT ''," +
        "msg_type TEXT NOT NULL DEFAULT 'text'," +
        "ai_generated INTEGER NOT NULL DEFAULT 0," +
        "intent TEXT NOT NULL DEFAULT ''," +
        "occurred_at TEXT NOT NULL," +
        "created_at TEXT NOT NULL DEFAULT (datetime('now')))"
    );
};

export const upsertThread = async (env, waId, patch = {}) => {
    if (!env?.INTAKE_DB || !waId) return;
    const now = new Date().toISOString();
    await env.INTAKE_DB
        .prepare(
            "INSERT INTO whatsapp_threads (wa_id, display_name, locale, status, intent, last_inbound_at, last_outbound_at, escalated_at, auto_replies_count, updated_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
            "ON CONFLICT(wa_id) DO UPDATE SET " +
            "display_name = COALESCE(NULLIF(excluded.display_name, ''), display_name), " +
            "locale = COALESCE(NULLIF(excluded.locale, ''), locale), " +
            "status = COALESCE(NULLIF(excluded.status, ''), status), " +
            "intent = COALESCE(NULLIF(excluded.intent, ''), intent), " +
            "last_inbound_at = COALESCE(excluded.last_inbound_at, last_inbound_at), " +
            "last_outbound_at = COALESCE(excluded.last_outbound_at, last_outbound_at), " +
            "escalated_at = COALESCE(excluded.escalated_at, escalated_at), " +
            "auto_replies_count = whatsapp_threads.auto_replies_count + excluded.auto_replies_count, " +
            "updated_at = excluded.updated_at"
        )
        .bind(
            waId,
            sanitize(patch.displayName, 200),
            sanitize(patch.locale, 4),
            sanitize(patch.status, 16),
            sanitize(patch.intent, 32),
            patch.lastInboundAt || null,
            patch.lastOutboundAt || null,
            patch.escalatedAt || null,
            Number(patch.autoRepliesDelta) || 0,
            now
        )
        .run();
};

export const recordMessage = async (env, msg) => {
    if (!env?.INTAKE_DB || !msg?.waMessageId) return false;
    try {
        await env.INTAKE_DB
            .prepare(
                "INSERT INTO whatsapp_messages (wa_message_id, wa_id, direction, body, msg_type, ai_generated, intent, occurred_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(
                sanitize(msg.waMessageId, 120),
                sanitize(msg.waId, 32),
                msg.direction === "outbound" ? "outbound" : "inbound",
                sanitize(msg.body, 4000),
                sanitize(msg.msgType || "text", 24),
                msg.aiGenerated ? 1 : 0,
                sanitize(msg.intent, 32),
                msg.occurredAt || new Date().toISOString()
            )
            .run();
        return true;
    } catch (err) {
        // UNIQUE constraint on wa_message_id => already processed (idempotent)
        return false;
    }
};

export const loadRecentMessages = async (env, waId, limit = 12) => {
    if (!env?.INTAKE_DB) return [];
    const result = await env.INTAKE_DB
        .prepare(
            "SELECT direction, body, ai_generated, intent, occurred_at FROM whatsapp_messages " +
            "WHERE wa_id = ? ORDER BY occurred_at DESC LIMIT ?"
        )
        .bind(waId, Math.min(Math.max(Number(limit) || 12, 1), 50))
        .all();
    const rows = result?.results || [];
    return rows.reverse();
};

export const loadThread = async (env, waId) => {
    if (!env?.INTAKE_DB) return null;
    const row = await env.INTAKE_DB
        .prepare("SELECT * FROM whatsapp_threads WHERE wa_id = ?")
        .bind(waId)
        .first();
    return row || null;
};

export const listThreads = async (env, limit = 50) => {
    if (!env?.INTAKE_DB) return [];
    const result = await env.INTAKE_DB
        .prepare(
            "SELECT wa_id, display_name, locale, status, intent, auto_replies_count, last_inbound_at, last_outbound_at, escalated_at, updated_at " +
            "FROM whatsapp_threads ORDER BY updated_at DESC LIMIT ?"
        )
        .bind(Math.min(Math.max(Number(limit) || 50, 1), 200))
        .all();
    return result?.results || [];
};

// ---------------------------------------------------------------------------
// Structured intake flow  (state machine: DEVICE → SYMPTOMS → URGENCY → COMPLETE)
// State is persisted in whatsapp_threads.qualification_json as JSON.
// ---------------------------------------------------------------------------

const DEVICE_OPTIONS = {
    dev_hdd:   { fr: "Disque dur interne/externe", en: "Internal/external HDD" },
    dev_ssd:   { fr: "SSD / M.2 / NVMe",          en: "SSD / M.2 / NVMe" },
    dev_usb:   { fr: "Clé USB / Carte mémoire",   en: "USB drive / Memory card" },
    dev_raid:  { fr: "RAID / NAS / Serveur",       en: "RAID / NAS / Server" },
    dev_phone: { fr: "Téléphone / Tablette",       en: "Phone / Tablet" },
    dev_other: { fr: "Autre / Je ne sais pas",     en: "Other / Not sure" }
};

const SYMPTOM_OPTIONS = {
    sym_click:     { fr: "Bruit, claquement",             en: "Clicking / grinding noise" },
    sym_nodisk:    { fr: "Ne démarre plus / Non détecté", en: "Won't power on / Not detected" },
    sym_water:     { fr: "Dégât liquide ou choc",         en: "Water damage or physical drop" },
    sym_delete:    { fr: "Données effacées ou formaté",   en: "Files deleted or formatted" },
    sym_partition: { fr: "Erreur de lecture / Partition", en: "Read errors / Lost partition" },
    sym_other:     { fr: "Autre symptôme",                en: "Other symptom" }
};

const URGENCY_OPTIONS = {
    urg_standard: { fr: "Standard (3–7 jours)",  en: "Standard (3–7 days)" },
    urg_priority: { fr: "Prioritaire (24–48 h)", en: "Priority (24–48 h)" },
    urg_critical: { fr: "Urgent / Légal",         en: "Urgent / Legal" }
};

// Resolve a button/list ID to a human-readable label; fall back to raw text.
const resolveOption = (id, options, locale) => {
    const opt = options[sanitize(id, 64)];
    if (opt) return opt[locale] || opt.fr;
    return sanitize(id, 100);
};

// Extract the selected ID from an interactive (button or list) message object.
const extractInteractiveId = (msg) => {
    if (!msg) return null;
    if (msg.type === "button") return sanitize(msg.button?.payload || msg.button?.text, 256) || null;
    if (msg.type === "interactive") {
        return sanitize(
            msg.interactive?.button_reply?.id
            || msg.interactive?.list_reply?.id
            || msg.interactive?.button_reply?.title
            || msg.interactive?.list_reply?.title,
            256
        ) || null;
    }
    if (msg.type === "text") return sanitize(msg.text?.body, 256) || null;
    return null;
};

// Device-type list sections (bilingual).
const deviceSections = (locale) => [
    {
        title: locale === "en" ? "Storage" : "Stockage",
        rows: [
            { id: "dev_hdd",   title: locale === "en" ? "HDD (int./ext.)"   : "Disque dur int./ext." },
            { id: "dev_ssd",   title: "SSD / M.2 / NVMe" },
            { id: "dev_usb",   title: locale === "en" ? "USB / Memory card" : "Clé USB / Carte mém." }
        ]
    },
    {
        title: locale === "en" ? "Server" : "Serveur",
        rows: [
            { id: "dev_raid",  title: "RAID / NAS / Server" }
        ]
    },
    {
        title: "Mobile",
        rows: [
            { id: "dev_phone", title: locale === "en" ? "Phone / Tablet"    : "Téléphone / Tablette" },
            { id: "dev_other", title: locale === "en" ? "Other / Not sure"  : "Autre / Je ne sais pas" }
        ]
    }
];

// Symptom list sections (bilingual).
const symptomSections = (locale) => [
    {
        title: locale === "en" ? "Physical damage" : "Défaillance physique",
        rows: [
            { id: "sym_click",  title: locale === "en" ? "Clicking / grinding" : "Bruit, claquement" },
            { id: "sym_nodisk", title: locale === "en" ? "Won't power on"       : "Ne démarre plus" },
            { id: "sym_water",  title: locale === "en" ? "Water / drop"         : "Eau / choc physique" }
        ]
    },
    {
        title: locale === "en" ? "Logical issue" : "Défaillance logique",
        rows: [
            { id: "sym_delete",    title: locale === "en" ? "Deleted / Formatted" : "Effacé / Formaté" },
            { id: "sym_partition", title: locale === "en" ? "Read error / Partition" : "Erreur / Partition" },
            { id: "sym_other",     title: locale === "en" ? "Other"                  : "Autre" }
        ]
    }
];

// Urgency buttons (3 max — fits WhatsApp interactive button limit).
const urgencyButtons = (locale) => [
    { id: "urg_standard", title: locale === "en" ? "Standard (3-7 days)"  : "Standard (3-7 j.)" },
    { id: "urg_priority", title: locale === "en" ? "Priority (24-48 h)"   : "Prioritaire (24-48h)" },
    { id: "urg_critical", title: locale === "en" ? "Urgent / Legal"        : "Urgent / Légal" }
];

// Intake message copy (bilingual).
const intakeCopy = {
    welcome: {
        fr: "Bienvenue chez NEXURA DATA. Pour lancer votre diagnostic gratuit, répondez à 3 courtes questions. Quel appareil est affecté ?",
        en: "Welcome to NEXURA DATA. To start your free assessment, answer 3 quick questions. Which device is affected?"
    },
    chooseBtn: { fr: "Choisir", en: "Choose" },
    symptomsPrompt: (locale, device) => locale === "en"
        ? `Device: *${device}*. What is the main symptom?`
        : `Appareil : *${device}*. Quel est le symptôme principal ?`,
    urgencyPrompt: (locale, symptoms) => locale === "en"
        ? `Symptom: *${symptoms}*. What level of urgency?`
        : `Symptôme : *${symptoms}*. Quel niveau d'urgence ?`,
    complete: (locale, qual) => {
        const d = qual.device || "—";
        const s = qual.symptoms || "—";
        const u = qual.urgency || "—";
        return locale === "en"
            ? `Summary:\n• Device: ${d}\n• Symptom: ${s}\n• Urgency: ${u}\n\nA NEXURA DATA examiner will follow up. For immediate help, call 438\u00a0813-0592 or email dossiers@nexuradata.ca.`
            : `Résumé :\n• Appareil : ${d}\n• Symptôme : ${s}\n• Urgence : ${u}\n\nUn examinateur NEXURA DATA vous contactera. Pour une aide immédiate, appelez le 438\u00a0813-0592 ou écrivez à dossiers@nexuradata.ca.`;
    }
};

// Parse qualification_json safely. Returns null on error or empty string.
export const parseQualification = (jsonStr) => {
    if (!jsonStr) return null;
    try { return JSON.parse(jsonStr); } catch { return null; }
};

// Returns true when the thread is actively inside the intake flow (step != COMPLETE).
export const isInIntakeFlow = (thread) => {
    const q = parseQualification(thread?.qualification_json);
    return Boolean(q && q.step && q.step !== "COMPLETE");
};

// Returns true when a brand-new thread should trigger the intake flow.
export const shouldStartIntake = (thread) => {
    if (!thread) return true;
    const q = parseQualification(thread.qualification_json);
    return !q && (thread.status === "auto" || !thread.status);
};

// Persist qualification state to D1.
export const saveQualification = async (env, waId, qual) => {
    if (!env?.INTAKE_DB || !waId) return;
    await env.INTAKE_DB
        .prepare("UPDATE whatsapp_threads SET qualification_json = ?, updated_at = ? WHERE wa_id = ?")
        .bind(JSON.stringify(qual), new Date().toISOString(), sanitize(waId, 32))
        .run();
};

// Start the intake flow: save initial state and send device-type list.
// Caller must have already created the thread row via upsertThread.
export const startIntake = async (env, waId, locale) => {
    const qual = { step: "DEVICE", device: null, symptoms: null, urgency: null, locale };
    await saveQualification(env, waId, qual);
    await sendWhatsAppList(
        env, waId,
        intakeCopy.welcome[locale] || intakeCopy.welcome.fr,
        intakeCopy.chooseBtn[locale] || intakeCopy.chooseBtn.fr,
        deviceSections(locale)
    );
    return qual;
};

// Advance the intake state machine one step.
// msg: the raw WhatsApp message object (for ID extraction).
// Returns { handled: true, newQual } when the intake handled the message,
// or { handled: false } when the intake is complete/inactive (fall through to AI).
export const runIntakeStep = async (env, waId, qual, msg, locale) => {
    const step = qual?.step;
    if (!step || step === "COMPLETE") return { handled: false };

    const selectedId = extractInteractiveId(msg) || "";

    if (step === "DEVICE") {
        const device = resolveOption(selectedId, DEVICE_OPTIONS, locale);
        const newQual = { ...qual, step: "SYMPTOMS", device, locale };
        await saveQualification(env, waId, newQual);
        await sendWhatsAppList(
            env, waId,
            intakeCopy.symptomsPrompt(locale, device),
            intakeCopy.chooseBtn[locale] || intakeCopy.chooseBtn.fr,
            symptomSections(locale)
        );
        return { handled: true, newQual };
    }

    if (step === "SYMPTOMS") {
        const symptoms = resolveOption(selectedId, SYMPTOM_OPTIONS, locale);
        const newQual = { ...qual, step: "URGENCY", symptoms, locale };
        await saveQualification(env, waId, newQual);
        await sendWhatsAppButtons(
            env, waId,
            intakeCopy.urgencyPrompt(locale, symptoms),
            urgencyButtons(locale)
        );
        return { handled: true, newQual };
    }

    if (step === "URGENCY") {
        const urgency = resolveOption(selectedId, URGENCY_OPTIONS, locale);
        const newQual = { ...qual, step: "COMPLETE", urgency, locale };
        await saveQualification(env, waId, newQual);
        await sendWhatsAppText(env, waId, intakeCopy.complete(locale, newQual));
        // Notify lab via Resend (fire-and-forget — do not block reply).
        notifyIntakeLead(env, waId, newQual).catch(() => {});
        return { handled: true, newQual };
    }

    return { handled: false };
};

// Send intake lead notification email to the lab inbox via Resend.
const notifyIntakeLead = async (env, waId, qual) => {
    const apiKey = sanitize(env?.RESEND_API_KEY, 256);
    const from = sanitize(env?.RESEND_FROM_EMAIL, 200);
    const to = sanitize(env?.LAB_INBOX_EMAIL, 200);
    if (!apiKey || !from || !to) return;
    const subject = `[WhatsApp] Lead qualifié — ${qual.device || "Appareil inconnu"}`;
    const lines = [
        "Nouveau lead WhatsApp qualifié.",
        "",
        `Numéro WhatsApp : ${waId}`,
        `Appareil        : ${qual.device || "—"}`,
        `Symptôme        : ${qual.symptoms || "—"}`,
        `Urgence         : ${qual.urgency || "—"}`,
        `Langue          : ${qual.locale || "fr"}`,
        `Horodatage      : ${new Date().toISOString()}`
    ];
    await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "content-type": "application/json"
        },
        body: JSON.stringify({ from, to, subject, text: lines.join("\n") })
    });
};
