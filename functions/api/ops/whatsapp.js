// Ops-only: list WhatsApp threads, view a conversation, send a manual reply,
// flip thread status (auto / human / closed).
import { authorizeOpsRequest } from "../../_lib/cases.js";
import { json, methodNotAllowed, onOptions, parsePayload } from "../../_lib/http.js";
import {
  ensureWhatsAppSchema,
  listThreads,
  loadThread,
  loadRecentMessages,
  recordMessage,
  upsertThread,
  sendWhatsAppText,
  sanitize
} from "../../_lib/whatsapp.js";

const VALID_STATUS = new Set(["auto", "human", "escalated", "closed"]);

const reject = () => json({ ok: false, message: "Accès opérateur refusé." }, { status: 403 });

export const onRequestOptions = () => onOptions("GET, POST, OPTIONS");

export const onRequestGet = async ({ request, env }) => {
  const auth = authorizeOpsRequest(request, env);
  if (!auth.ok) return reject();
  if (!env?.INTAKE_DB) return json({ ok: false, message: "DB indisponible." }, { status: 503 });
  await ensureWhatsAppSchema(env);

  const url = new URL(request.url);
  const waId = sanitize(url.searchParams.get("wa_id"), 32);

  if (waId) {
    const thread = await loadThread(env, waId);
    const messages = await loadRecentMessages(env, waId, 50);
    return json({ ok: true, thread, messages });
  }

  const threads = await listThreads(env, 50);
  return json({ ok: true, threads });
};

export const onRequestPost = async ({ request, env }) => {
  const auth = authorizeOpsRequest(request, env);
  if (!auth.ok) return reject();
  if (!env?.INTAKE_DB) return json({ ok: false, message: "DB indisponible." }, { status: 503 });
  await ensureWhatsAppSchema(env);

  let payload;
  try {
    payload = await parsePayload(request);
  } catch {
    return json({ ok: false, message: "Payload invalide." }, { status: 400 });
  }

  const action = sanitize(payload?.action, 24) || "send";
  const waId = sanitize(payload?.wa_id, 32);
  if (!waId) return json({ ok: false, message: "wa_id requis." }, { status: 400 });

  if (action === "set_status") {
    const status = sanitize(payload?.status, 16);
    if (!VALID_STATUS.has(status)) return json({ ok: false, message: "Statut invalide." }, { status: 400 });
    await upsertThread(env, waId, { status });
    return json({ ok: true, status });
  }

  if (action === "send") {
    const body = sanitize(payload?.body, 4000);
    if (!body) return json({ ok: false, message: "Message vide." }, { status: 400 });
    const send = await sendWhatsAppText(env, waId, body);
    if (!send.ok) {
      return json({ ok: false, message: `Envoi refusé: ${send.reason || "inconnu"}` }, { status: 502 });
    }
    await recordMessage(env, {
      waMessageId: send.messageId || `manual-${Date.now()}`,
      waId,
      direction: "outbound",
      body,
      msgType: "text",
      aiGenerated: 0,
      intent: "manual",
      occurredAt: new Date().toISOString()
    });
    await upsertThread(env, waId, {
      status: "human",
      lastOutboundAt: new Date().toISOString()
    });
    return json({ ok: true, messageId: send.messageId });
  }

  return json({ ok: false, message: "Action inconnue." }, { status: 400 });
};

export const onRequest = async (ctx) => {
  if (ctx.request.method === "OPTIONS") return onOptions("GET, POST, OPTIONS");
  if (ctx.request.method === "GET") return onRequestGet(ctx);
  if (ctx.request.method === "POST") return onRequestPost(ctx);
  return methodNotAllowed();
};
