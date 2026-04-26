-- Lightweight conversion tracking for marketing telemetry.
-- Captures call clicks, WhatsApp clicks, form submits, and arbitrary
-- data-track events sent via navigator.sendBeacon from assets/js/site.js.
-- No PII. IP and User-Agent are stored as opaque hashes only.
CREATE TABLE IF NOT EXISTS tracking_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL DEFAULT '',
  referrer TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT '',
  ip_hash TEXT NOT NULL DEFAULT '',
  ua_hash TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_event ON tracking_events(event);
CREATE INDEX IF NOT EXISTS idx_tracking_events_created ON tracking_events(created_at);
CREATE INDEX IF NOT EXISTS idx_tracking_events_path ON tracking_events(path);
