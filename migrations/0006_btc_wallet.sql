-- BTC HD wallet rotation: pre-derived address pool + invoice tracking
-- Operator generates BIP-84 addresses OFFLINE (Sparrow/Electrum) from a watch-only zpub,
-- then bulk-imports them here. xpub never reaches the server.

CREATE TABLE IF NOT EXISTS btc_address_pool (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  derivation_index INTEGER NOT NULL UNIQUE,
  address TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'unused',  -- unused | assigned | spent | retired
  assigned_to_ref TEXT NOT NULL DEFAULT '',
  assigned_at TEXT NOT NULL DEFAULT '',
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_btc_pool_status ON btc_address_pool(status);
CREATE INDEX IF NOT EXISTS idx_btc_pool_index ON btc_address_pool(derivation_index);

CREATE TABLE IF NOT EXISTS btc_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE,
  case_ref TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL UNIQUE,
  derivation_index INTEGER NOT NULL,
  amount_sats INTEGER NOT NULL,
  amount_cad_cents INTEGER NOT NULL,
  rate_cad_per_btc INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | seen | confirmed | expired | cancelled
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  first_seen_at TEXT NOT NULL DEFAULT '',
  confirmed_at TEXT NOT NULL DEFAULT '',
  tx_id TEXT NOT NULL DEFAULT '',
  confirmations INTEGER NOT NULL DEFAULT 0,
  received_sats INTEGER NOT NULL DEFAULT 0,
  last_polled_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_btc_invoices_ref ON btc_invoices(ref);
CREATE INDEX IF NOT EXISTS idx_btc_invoices_case ON btc_invoices(case_ref);
CREATE INDEX IF NOT EXISTS idx_btc_invoices_status ON btc_invoices(status);
CREATE INDEX IF NOT EXISTS idx_btc_invoices_created ON btc_invoices(created_at DESC);
