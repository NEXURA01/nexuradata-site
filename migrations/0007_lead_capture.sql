-- Lead capture for win-back / abandoned-quote recovery
-- People who get a quote estimate but never open a case.
CREATE TABLE IF NOT EXISTS lead_captures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT 'fr',
  source TEXT NOT NULL DEFAULT 'quote',     -- quote | chat | exit-intent | other
  device TEXT NOT NULL DEFAULT '',
  issue TEXT NOT NULL DEFAULT '',
  urgency TEXT NOT NULL DEFAULT '',
  estimate_min_cad INTEGER NOT NULL DEFAULT 0,
  estimate_max_cad INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  consent_ip TEXT NOT NULL DEFAULT '',
  consent_ua TEXT NOT NULL DEFAULT '',
  captured_at TEXT NOT NULL DEFAULT (datetime('now')),
  recovery_sent_at TEXT NOT NULL DEFAULT '',
  recovery_count INTEGER NOT NULL DEFAULT 0,
  converted_at TEXT NOT NULL DEFAULT '',
  converted_case_id TEXT NOT NULL DEFAULT '',
  unsubscribed_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON lead_captures(email);
CREATE INDEX IF NOT EXISTS idx_leads_captured ON lead_captures(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_recovery_pending
  ON lead_captures(captured_at)
  WHERE recovery_sent_at = '' AND converted_at = '' AND unsubscribed_at = '';

-- Unsubscribe list (single source of truth across newsletter + win-back)
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  email TEXT PRIMARY KEY,
  reason TEXT NOT NULL DEFAULT '',
  unsubscribed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
