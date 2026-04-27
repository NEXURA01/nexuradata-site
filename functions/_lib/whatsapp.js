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

export const sendWhatsAppText = async (env, toWaId, text) => {
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
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toWaId,
        type: "text",
        text: { body: sanitize(text, 4000) }
      })
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, reason: data?.error?.message || `http_${resp.status}` };
    const messageId = data?.messages?.[0]?.id || "";
    return { ok: true, messageId };
  } catch (err) {
    return { ok: false, reason: err?.message || "network" };
  }
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
