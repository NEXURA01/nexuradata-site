-- Appointments: drop-off and consultation booking with optional Stripe deposit
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE,
  slot_date TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT 'fr',
  support_type TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT NOT NULL DEFAULT '',
  deposit_paid INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT NOT NULL DEFAULT '',
  cancelled_at TEXT NOT NULL DEFAULT '',
  consent_ip TEXT NOT NULL DEFAULT '',
  consent_ua TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_appointments_slot ON appointments(slot_date, slot_time);
CREATE INDEX IF NOT EXISTS idx_appointments_email ON appointments(email);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_slot ON appointments(slot_date, slot_time)
  WHERE status IN ('pending', 'confirmed');
