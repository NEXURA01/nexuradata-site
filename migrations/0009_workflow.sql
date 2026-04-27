-- Technical workflow per case: diagnostic, extraction, reparation, verification, livraison.
-- Each case gets exactly one row per stage (auto-created on demand).
-- Operator updates status, notes, time spent, and stage-specific structured data (JSON).
CREATE TABLE IF NOT EXISTS case_workflow_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT NOT NULL DEFAULT '',
  data_json TEXT NOT NULL DEFAULT '{}',
  minutes_spent INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT '',
  completed_at TEXT NOT NULL DEFAULT '',
  operator TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(case_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_workflow_case ON case_workflow_steps(case_id);
CREATE INDEX IF NOT EXISTS idx_workflow_stage ON case_workflow_steps(stage);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON case_workflow_steps(status);
