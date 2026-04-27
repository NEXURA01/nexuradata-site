import { authorizeOpsRequest, getCaseDetail, normalizeCaseId, normalizeText, normalizeMultilineText, recordCaseEvent } from "../../_lib/cases.js";
import { json, methodNotAllowed, onOptions, parsePayload } from "../../_lib/http.js";

const STAGES = ["diagnostic", "extraction", "reparation", "verification", "livraison"];
const STATUSES = new Set(["pending", "in_progress", "blocked", "complete", "skipped"]);

const authorizeOrReject = (request, env) => {
  const auth = authorizeOpsRequest(request, env);
  if (!auth.ok) {
    return json({ ok: false, message: "Accès opérateur refusé." }, { status: 403 });
  }
  return auth;
};

const ensureSchema = async (env) => {
  await env.INTAKE_DB.exec(
    "CREATE TABLE IF NOT EXISTS case_workflow_steps (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT," +
      "case_id TEXT NOT NULL," +
      "stage TEXT NOT NULL," +
      "status TEXT NOT NULL DEFAULT 'pending'," +
      "notes TEXT NOT NULL DEFAULT ''," +
      "data_json TEXT NOT NULL DEFAULT '{}'," +
      "minutes_spent INTEGER NOT NULL DEFAULT 0," +
      "started_at TEXT NOT NULL DEFAULT ''," +
      "completed_at TEXT NOT NULL DEFAULT ''," +
      "operator TEXT NOT NULL DEFAULT ''," +
      "created_at TEXT NOT NULL DEFAULT (datetime('now'))," +
      "updated_at TEXT NOT NULL DEFAULT (datetime('now'))," +
      "UNIQUE(case_id, stage))"
  );
};

const fetchSteps = async (env, caseId) => {
  const result = await env.INTAKE_DB
    .prepare("SELECT stage, status, notes, data_json, minutes_spent, started_at, completed_at, operator, updated_at FROM case_workflow_steps WHERE case_id = ? ORDER BY stage")
    .bind(caseId)
    .all();
  const rows = result?.results || [];
  const byStage = new Map(rows.map((r) => [r.stage, r]));
  return STAGES.map((stage) => {
    const row = byStage.get(stage);
    if (!row) {
      return {
        stage,
        status: "pending",
        notes: "",
        data: {},
        minutesSpent: 0,
        startedAt: "",
        completedAt: "",
        operator: "",
        updatedAt: ""
      };
    }
    let data = {};
    try {
      data = JSON.parse(row.data_json || "{}");
    } catch {
      data = {};
    }
    return {
      stage: row.stage,
      status: row.status,
      notes: row.notes || "",
      data,
      minutesSpent: row.minutes_spent || 0,
      startedAt: row.started_at || "",
      completedAt: row.completed_at || "",
      operator: row.operator || "",
      updatedAt: row.updated_at || ""
    };
  });
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
    const steps = await fetchSteps(context.env, caseId);
    return json({
      ok: true,
      caseId,
      caseSummary: {
        clientName: detail.clientName || "",
        supportType: detail.supportType || "",
        urgency: detail.urgency || "",
        status: detail.status || ""
      },
      steps
    });
  } catch (error) {
    return json({ ok: false, message: "Erreur de lecture workflow." }, { status: 500 });
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
  const stage = normalizeText(payload?.stage, 32);
  const status = normalizeText(payload?.status, 16) || "pending";
  const notes = normalizeMultilineText(payload?.notes, 4000);
  const minutesSpent = Math.max(0, Math.min(10000, Number.parseInt(payload?.minutesSpent, 10) || 0));
  const operator = normalizeText(auth.actor || payload?.operator, 160);

  if (!caseId) {
    return json({ ok: false, message: "caseId requis." }, { status: 400 });
  }
  if (!STAGES.includes(stage)) {
    return json({ ok: false, message: "stage invalide." }, { status: 400 });
  }
  if (!STATUSES.has(status)) {
    return json({ ok: false, message: "status invalide." }, { status: 400 });
  }

  let dataJson = "{}";
  if (payload?.data && typeof payload.data === "object") {
    try {
      dataJson = JSON.stringify(payload.data).slice(0, 8000);
    } catch {
      dataJson = "{}";
    }
  }

  const detail = await getCaseDetail(context.env, caseId);
  if (!detail) {
    return json({ ok: false, message: "Dossier introuvable." }, { status: 404 });
  }

  await ensureSchema(context.env);

  const now = new Date().toISOString();
  const startedAt = status === "in_progress" || status === "complete" ? now : "";
  const completedAt = status === "complete" ? now : "";

  await context.env.INTAKE_DB
    .prepare(
      "INSERT INTO case_workflow_steps (case_id, stage, status, notes, data_json, minutes_spent, started_at, completed_at, operator, created_at, updated_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, COALESCE(NULLIF(?, ''), ''), COALESCE(NULLIF(?, ''), ''), ?, ?, ?) " +
        "ON CONFLICT(case_id, stage) DO UPDATE SET " +
        "status = excluded.status, " +
        "notes = excluded.notes, " +
        "data_json = excluded.data_json, " +
        "minutes_spent = excluded.minutes_spent, " +
        "started_at = CASE WHEN case_workflow_steps.started_at = '' THEN excluded.started_at ELSE case_workflow_steps.started_at END, " +
        "completed_at = excluded.completed_at, " +
        "operator = excluded.operator, " +
        "updated_at = excluded.updated_at"
    )
    .bind(caseId, stage, status, notes, dataJson, minutesSpent, startedAt, completedAt, operator, now, now)
    .run();

  try {
    await recordCaseEvent(
      context.env,
      caseId,
      operator || "ops",
      `Workflow ${stage}`,
      `Statut: ${status}${notes ? ` — ${notes.slice(0, 400)}` : ""}`
    );
  } catch {
    // best-effort logging
  }

  const steps = await fetchSteps(context.env, caseId);
  return json({ ok: true, caseId, steps });
};

export const onRequest = async (context) => methodNotAllowed("GET, POST, OPTIONS");
