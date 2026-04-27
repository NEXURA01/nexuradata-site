import { authorizeOpsRequest, getCaseDetail, normalizeCaseId, normalizeText, normalizeMultilineText, recordCaseEvent } from "../../_lib/cases.js";
import { json, methodNotAllowed, onOptions, parsePayload } from "../../_lib/http.js";

const EVENT_TYPES = new Set([
  "reception",
  "internal_transfer",
  "imaging_started",
  "imaging_complete",
  "sealing",
  "external_transfer",
  "return",
  "destruction"
]);

const HEX_SHA256 = /^[0-9a-f]{64}$/i;
const HEX_MD5 = /^[0-9a-f]{32}$/i;

const authorizeOrReject = (request, env) => {
  const auth = authorizeOpsRequest(request, env);
  if (!auth.ok) {
    return json({ ok: false, message: "Accès opérateur refusé." }, { status: 403 });
  }
  return auth;
};

const ensureSchema = async (env) => {
  await env.INTAKE_DB.exec(
    "CREATE TABLE IF NOT EXISTS case_chain_of_custody (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT," +
      "case_id TEXT NOT NULL," +
      "sequence INTEGER NOT NULL DEFAULT 1," +
      "event_type TEXT NOT NULL," +
      "occurred_at TEXT NOT NULL," +
      "location TEXT NOT NULL DEFAULT ''," +
      "from_party TEXT NOT NULL DEFAULT ''," +
      "to_party TEXT NOT NULL DEFAULT ''," +
      "device_label TEXT NOT NULL DEFAULT ''," +
      "device_serial TEXT NOT NULL DEFAULT ''," +
      "seal_id TEXT NOT NULL DEFAULT ''," +
      "hash_sha256 TEXT NOT NULL DEFAULT ''," +
      "hash_md5 TEXT NOT NULL DEFAULT ''," +
      "notes TEXT NOT NULL DEFAULT ''," +
      "operator TEXT NOT NULL DEFAULT ''," +
      "witness TEXT NOT NULL DEFAULT ''," +
      "signature_ref TEXT NOT NULL DEFAULT ''," +
      "created_at TEXT NOT NULL DEFAULT (datetime('now')))"
  );
};

const fetchEvents = async (env, caseId) => {
  const result = await env.INTAKE_DB
    .prepare(
      "SELECT id, sequence, event_type, occurred_at, location, from_party, to_party, device_label, device_serial, seal_id, hash_sha256, hash_md5, notes, operator, witness, signature_ref, created_at " +
        "FROM case_chain_of_custody WHERE case_id = ? ORDER BY sequence ASC, id ASC"
    )
    .bind(caseId)
    .all();
  const rows = result?.results || [];
  return rows.map((r) => ({
    id: r.id,
    sequence: r.sequence,
    eventType: r.event_type,
    occurredAt: r.occurred_at,
    location: r.location || "",
    fromParty: r.from_party || "",
    toParty: r.to_party || "",
    deviceLabel: r.device_label || "",
    deviceSerial: r.device_serial || "",
    sealId: r.seal_id || "",
    hashSha256: r.hash_sha256 || "",
    hashMd5: r.hash_md5 || "",
    notes: r.notes || "",
    operator: r.operator || "",
    witness: r.witness || "",
    signatureRef: r.signature_ref || "",
    createdAt: r.created_at
  }));
};

export const onRequestOptions = () => onOptions("GET, POST, OPTIONS");

export const onRequestGet = async (context) => {
  if (!context.env?.INTAKE_DB) {
    return json({ ok: false, message: "Service temporairement indisponible." }, { status: 503 });
  }
  const auth = authorizeOrReject(context.request, context.env);
  if (auth instanceof Response) return auth;

  try {
    const url = new URL(context.request.url);
    const caseId = normalizeCaseId(url.searchParams.get("caseId"));
    if (!caseId) {
      return json({ ok: false, message: "caseId requis." }, { status: 400 });
    }
    const detail = await getCaseDetail(context.env, caseId);
    if (!detail) {
      return json({ ok: false, message: "Dossier introuvable." }, { status: 404 });
    }
    await ensureSchema(context.env);
    const events = await fetchEvents(context.env, caseId);
    return json({
      ok: true,
      caseId,
      caseSummary: {
        clientName: detail.clientName || "",
        supportType: detail.supportType || "",
        urgency: detail.urgency || "",
        status: detail.status || ""
      },
      events
    });
  } catch (error) {
    return json({ ok: false, message: "Erreur de lecture chaîne de possession." }, { status: 500 });
  }
};

export const onRequestPost = async (context) => {
  if (!context.env?.INTAKE_DB) {
    return json({ ok: false, message: "Service temporairement indisponible." }, { status: 503 });
  }
  const auth = authorizeOrReject(context.request, context.env);
  if (auth instanceof Response) return auth;

  let payload;
  try {
    payload = await parsePayload(context.request);
  } catch {
    return json({ ok: false, message: "Charge utile invalide." }, { status: 400 });
  }

  const caseId = normalizeCaseId(payload?.caseId);
  const eventType = normalizeText(payload?.eventType, 32);
  const occurredAtRaw = normalizeText(payload?.occurredAt, 40);
  const location = normalizeText(payload?.location, 200);
  const fromParty = normalizeText(payload?.fromParty, 160);
  const toParty = normalizeText(payload?.toParty, 160);
  const deviceLabel = normalizeText(payload?.deviceLabel, 200);
  const deviceSerial = normalizeText(payload?.deviceSerial, 120);
  const sealId = normalizeText(payload?.sealId, 80);
  const hashSha256Raw = normalizeText(payload?.hashSha256, 80);
  const hashMd5Raw = normalizeText(payload?.hashMd5, 40);
  const notes = normalizeMultilineText(payload?.notes, 4000);
  const witness = normalizeText(payload?.witness, 160);
  const signatureRef = normalizeText(payload?.signatureRef, 200);
  const operator = normalizeText(auth.actor || payload?.operator, 160);

  if (!caseId) {
    return json({ ok: false, message: "caseId requis." }, { status: 400 });
  }
  if (!EVENT_TYPES.has(eventType)) {
    return json({ ok: false, message: "eventType invalide." }, { status: 400 });
  }

  const occurredAt = occurredAtRaw || new Date().toISOString();
  if (Number.isNaN(Date.parse(occurredAt))) {
    return json({ ok: false, message: "occurredAt invalide." }, { status: 400 });
  }

  const hashSha256 = hashSha256Raw ? hashSha256Raw.toLowerCase() : "";
  const hashMd5 = hashMd5Raw ? hashMd5Raw.toLowerCase() : "";
  if (hashSha256 && !HEX_SHA256.test(hashSha256)) {
    return json({ ok: false, message: "hashSha256 doit être 64 caractères hex." }, { status: 400 });
  }
  if (hashMd5 && !HEX_MD5.test(hashMd5)) {
    return json({ ok: false, message: "hashMd5 doit être 32 caractères hex." }, { status: 400 });
  }

  const detail = await getCaseDetail(context.env, caseId);
  if (!detail) {
    return json({ ok: false, message: "Dossier introuvable." }, { status: 404 });
  }

  await ensureSchema(context.env);

  const seqRow = await context.env.INTAKE_DB
    .prepare("SELECT COALESCE(MAX(sequence), 0) AS max_seq FROM case_chain_of_custody WHERE case_id = ?")
    .bind(caseId)
    .first();
  const sequence = (seqRow?.max_seq || 0) + 1;

  await context.env.INTAKE_DB
    .prepare(
      "INSERT INTO case_chain_of_custody (case_id, sequence, event_type, occurred_at, location, from_party, to_party, device_label, device_serial, seal_id, hash_sha256, hash_md5, notes, operator, witness, signature_ref) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      caseId,
      sequence,
      eventType,
      occurredAt,
      location,
      fromParty,
      toParty,
      deviceLabel,
      deviceSerial,
      sealId,
      hashSha256,
      hashMd5,
      notes,
      operator,
      witness,
      signatureRef
    )
    .run();

  try {
    const summary = [eventType, deviceLabel || "", sealId ? `scellé ${sealId}` : ""].filter(Boolean).join(" · ");
    await recordCaseEvent(
      context.env,
      caseId,
      operator || "ops",
      `Chaîne de possession #${sequence}`,
      summary + (notes ? ` — ${notes.slice(0, 400)}` : "")
    );
  } catch {
    // best-effort logging
  }

  const events = await fetchEvents(context.env, caseId);
  return json({ ok: true, caseId, sequence, events });
};

export const onRequest = async () => methodNotAllowed("GET, POST, OPTIONS");
