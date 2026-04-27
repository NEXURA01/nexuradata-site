-- WhatsApp Cloud API conversation log + thread state.
-- Each row in whatsapp_messages = one inbound or outbound message.
-- Threads are per-phone (wa_id from Meta).

CREATE TABLE IF NOT EXISTS whatsapp_threads (
  wa_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT 'fr',
  status TEXT NOT NULL DEFAULT 'auto', -- auto | human | escalated | closed
  intent TEXT NOT NULL DEFAULT '',     -- price | status | escalation | qualified | other
  case_id TEXT NOT NULL DEFAULT '',
  qualification_json TEXT NOT NULL DEFAULT '',
  auto_replies_count INTEGER NOT NULL DEFAULT 0,
  last_inbound_at TEXT,
  last_outbound_at TEXT,
  escalated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wa_message_id TEXT NOT NULL UNIQUE,
  wa_id TEXT NOT NULL,
  direction TEXT NOT NULL, -- inbound | outbound
  body TEXT NOT NULL DEFAULT '',
  msg_type TEXT NOT NULL DEFAULT 'text',
  ai_generated INTEGER NOT NULL DEFAULT 0,
  intent TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wa_msgs_wa_id ON whatsapp_messages(wa_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_threads_status ON whatsapp_threads(status, updated_at DESC);
