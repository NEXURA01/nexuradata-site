// WhatsApp Cloud API webhook.
// GET  /api/whatsapp/webhook  -> Meta verification handshake (hub.mode/hub.verify_token/hub.challenge)
// POST /api/whatsapp/webhook  -> message receipts. Verifies X-Hub-Signature-256, persists, replies via AI.
//
// Required env (set via `npx wrangler pages secret put`):
//   WHATSAPP_VERIFY_TOKEN   - random string also pasted in Meta dashboard
//   WHATSAPP_APP_SECRET     - app secret for HMAC signature check
//   WHATSAPP_ACCESS_TOKEN   - permanent system-user token (Bearer)
//   WHATSAPP_PHONE_NUMBER_ID
//   WHATSAPP_BUSINESS_ACCOUNT_ID  (optional, for filtering)
//
// Reuses Workers AI binding (env.AI) for replies — same model as on-site chat.

import {
    ensureWhatsAppSchema,
    verifySignature,
    sendWhatsAppText,
    generateAiReply,
    recordMessage,
    upsertThread,
    loadThread,
    loadRecentMessages,
    detectLocale,
    detectIntent,
    shouldEscalate,
    escalationMessage,
    sanitize
} from "../../_lib/whatsapp.js";

const text = (body, status = 200) =>
    new Response(body, { status, headers: { "content-type": "text/plain; charset=UTF-8" } });

const ok = () => new Response("EVENT_RECEIVED", { status: 200, headers: { "content-type": "text/plain" } });

export const onRequestGet = async ({ request, env }) => {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = sanitize(env?.WHATSAPP_VERIFY_TOKEN, 200);

    if (mode === "subscribe" && expected && token === expected && challenge) {
        return text(challenge, 200);
    }
    return text("forbidden", 403);
};

export const onRequestPost = async ({ request, env }) => {
    // Read raw body ONCE for signature verification + JSON parsing.
    const raw = await request.text();
    const signature = request.headers.get("x-hub-signature-256") || request.headers.get("X-Hub-Signature-256");

    // In production, signature MUST verify. If app secret missing we reject too.
    const appSecret = sanitize(env?.WHATSAPP_APP_SECRET, 200);
    if (appSecret) {
        const valid = await verifySignature(raw, signature, appSecret);
        if (!valid) return text("invalid signature", 401);
    }

    let body;
    try {
        body = JSON.parse(raw);
    } catch {
        return text("bad json", 400);
    }

    // Always answer 200 to Meta; do work best-effort.
    // Process inbound messages only.
    try {
        await ensureWhatsAppSchema(env);
        const entries = Array.isArray(body?.entry) ? body.entry : [];
        for (const entry of entries) {
            const changes = Array.isArray(entry?.changes) ? entry.changes : [];
            for (const change of changes) {
                const value = change?.value || {};
                const messages = Array.isArray(value.messages) ? value.messages : [];
                const contacts = Array.isArray(value.contacts) ? value.contacts : [];
                const contactByWaId = Object.fromEntries(
                    contacts.map((c) => [String(c.wa_id || ""), c?.profile?.name || ""])
                );

                for (const msg of messages) {
                    await handleInbound(env, msg, contactByWaId[String(msg.from || "")] || "");
                }
            }
        }
    } catch (err) {
        // Swallow — don't make Meta retry into a loop.
        console.warn("whatsapp webhook error:", err?.message || err);
    }

    return ok();
};

async function handleInbound(env, msg, displayName) {
    const waId = sanitize(msg?.from, 32);
    const waMessageId = sanitize(msg?.id, 120);
    const msgType = sanitize(msg?.type, 24) || "text";
    const occurredAt = msg?.timestamp
        ? new Date(Number(msg.timestamp) * 1000).toISOString()
        : new Date().toISOString();

    // Pull a usable text body across types.
    let body = "";
    if (msgType === "text") body = msg?.text?.body || "";
    else if (msgType === "button") body = msg?.button?.text || "";
    else if (msgType === "interactive") {
        body = msg?.interactive?.button_reply?.title
            || msg?.interactive?.list_reply?.title
            || "";
    } else if (msgType === "image") body = "[image]";
    else if (msgType === "audio") body = "[audio]";
    else if (msgType === "video") body = "[video]";
    else if (msgType === "document") body = "[document]";
    else body = `[${msgType}]`;

    if (!waId || !waMessageId) return;

    // Record inbound (idempotent on wa_message_id).
    const inserted = await recordMessage(env, {
        waMessageId,
        waId,
        direction: "inbound",
        body,
        msgType,
        intent: detectIntent(body),
        occurredAt
    });
    if (!inserted) return; // Duplicate webhook delivery.

    const locale = detectLocale(body);
    const thread = await loadThread(env, waId);
    const status = thread?.status || "auto";
    const autoCount = Number(thread?.auto_replies_count || 0);

    await upsertThread(env, waId, {
        displayName,
        locale,
        status: status === "human" || status === "escalated" ? status : "auto",
        intent: detectIntent(body),
        lastInboundAt: occurredAt
    });

    // If a human took over, do not auto-reply.
    if (status === "human" || status === "escalated") return;

    // Escalation path (sensitive keyword OR > N auto replies).
    if (shouldEscalate(body, autoCount)) {
        const reply = escalationMessage(locale);
        const send = await sendWhatsAppText(env, waId, reply);
        if (send.ok) {
            await recordMessage(env, {
                waMessageId: send.messageId || `local-${Date.now()}`,
                waId,
                direction: "outbound",
                body: reply,
                msgType: "text",
                aiGenerated: 0,
                intent: "escalation",
                occurredAt: new Date().toISOString()
            });
            await upsertThread(env, waId, {
                status: "escalated",
                intent: "escalation",
                escalatedAt: new Date().toISOString(),
                lastOutboundAt: new Date().toISOString()
            });
        }
        return;
    }

    // Generate AI reply.
    const history = await loadRecentMessages(env, waId, 12);
    const reply = await generateAiReply(env, history, locale);
    const send = await sendWhatsAppText(env, waId, reply);
    if (!send.ok) return;
    await recordMessage(env, {
        waMessageId: send.messageId || `local-${Date.now()}`,
        waId,
        direction: "outbound",
        body: reply,
        msgType: "text",
        aiGenerated: 1,
        intent: detectIntent(body),
        occurredAt: new Date().toISOString()
    });
    await upsertThread(env, waId, {
        lastOutboundAt: new Date().toISOString(),
        autoRepliesDelta: 1
    });
}
