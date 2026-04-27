-- Chain of custody log per case (forensic-grade traceability).
-- Each row = a single custody event (reception, transfer, imaging, sealing, return).
-- Hash columns store SHA-256 / MD5 of media images for integrity proof.
CREATE TABLE IF NOT EXISTS case_chain_of_custody (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 1,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  from_party TEXT NOT NULL DEFAULT '',
  to_party TEXT NOT NULL DEFAULT '',
  device_label TEXT NOT NULL DEFAULT '',
  device_serial TEXT NOT NULL DEFAULT '',
  seal_id TEXT NOT NULL DEFAULT '',
  hash_sha256 TEXT NOT NULL DEFAULT '',
  hash_md5 TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  operator TEXT NOT NULL DEFAULT '',
  witness TEXT NOT NULL DEFAULT '',
  signature_ref TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_coc_case ON case_chain_of_custody(case_id);
CREATE INDEX IF NOT EXISTS idx_coc_case_seq ON case_chain_of_custody(case_id, sequence);
CREATE INDEX IF NOT EXISTS idx_coc_event_type ON case_chain_of_custody(event_type);
