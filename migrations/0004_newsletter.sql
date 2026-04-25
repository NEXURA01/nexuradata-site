-- Newsletter subscribers (Loi 25 compliant: explicit opt-in, source tracked,
-- unsubscribe token, no third-party data shared).
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL DEFAULT 'fr',
  source TEXT,                       -- e.g. 'footer-home', 'chat-widget'
  consent_text TEXT NOT NULL,        -- exact wording shown at opt-in (audit trail)
  consent_ip TEXT,
  consent_ua TEXT,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',  -- active | unsubscribed | bounced
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  unsubscribed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_created ON newsletter_subscribers(created_at);
