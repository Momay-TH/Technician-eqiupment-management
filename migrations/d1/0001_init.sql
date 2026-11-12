-- ============================================================
-- Technician Equipment Management — Cloudflare D1 (SQLite)
-- Migration 0001: schema
-- ============================================================

-- ---------- users ----------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','manager','technician','viewer')),
  phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (lower(username) GLOB '[a-z0-9._-]*' AND length(username) BETWEEN 3 AND 32)
);

-- ---------- permissions ----------
CREATE TABLE IF NOT EXISTS permissions (
  key TEXT PRIMARY KEY,
  label_th TEXT NOT NULL,
  label_en TEXT NOT NULL,
  "group" TEXT NOT NULL
);

-- ---------- permission overrides ----------
CREATE TABLE IF NOT EXISTS user_permission_overrides (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  effect TEXT NOT NULL DEFAULT 'inherit' CHECK (effect IN ('inherit','grant','deny')),
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, permission)
);

-- ---------- audit ----------
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  before TEXT,
  after TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- catalog ----------
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS device_types (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_archived INTEGER NOT NULL DEFAULT 0,
  UNIQUE (category_id, name)
);

CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id),
  device_type_id TEXT NOT NULL REFERENCES device_types(id),
  name TEXT NOT NULL,
  reference_price REAL,
  specs TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (brand_id, device_type_id, name)
);

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('warehouse','branch','vehicle')),
  code TEXT UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customer_sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- equipment ----------
CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  asset_code TEXT NOT NULL UNIQUE,
  serial_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  model_id TEXT NOT NULL REFERENCES models(id),
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock','in_vehicle','at_site','under_repair','damaged_pending_dispose','disposed')),
  location_id TEXT REFERENCES locations(id),
  customer_site_id TEXT REFERENCES customer_sites(id),
  assigned_to TEXT REFERENCES users(id),
  purchase_date TEXT,
  purchase_price REAL,
  vendor TEXT,
  warranty_months INTEGER,
  installed_at TEXT,
  installed_by TEXT REFERENCES users(id),
  image_urls TEXT NOT NULL DEFAULT '[]',
  receipt_url TEXT,
  notes TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS equipment_status_transitions (
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  allowed_roles TEXT NOT NULL DEFAULT '["admin","manager"]',
  PRIMARY KEY (from_status, to_status)
);

CREATE TABLE IF NOT EXISTS equipment_history (
  id TEXT PRIMARY KEY,
  equipment_id TEXT NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  from_location_id TEXT REFERENCES locations(id),
  to_location_id TEXT REFERENCES locations(id),
  from_site_id TEXT REFERENCES customer_sites(id),
  to_site_id TEXT REFERENCES customer_sites(id),
  from_user TEXT REFERENCES users(id),
  to_user TEXT REFERENCES users(id),
  notes TEXT,
  reason TEXT,
  performed_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- checkout ----------
CREATE TABLE IF NOT EXISTS checkout_requests (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  requested_by TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled','completed')),
  purpose TEXT,
  expected_return_date TEXT,
  approved_by TEXT REFERENCES users(id),
  approved_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS checkout_request_items (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES checkout_requests(id) ON DELETE CASCADE,
  equipment_id TEXT NOT NULL REFERENCES equipment(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','checked_out','returned','damaged','lost')),
  checked_out_at TEXT,
  returned_at TEXT,
  condition_on_return TEXT,
  return_notes TEXT,
  UNIQUE (request_id, equipment_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_checkout_per_equipment
  ON checkout_request_items (equipment_id)
  WHERE status = 'checked_out';

-- ---------- notifications ----------
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- login rate limit ----------
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS login_attempts_identifier_idx ON login_attempts (identifier, created_at DESC);

-- ---------- sessions (auth) ----------
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

-- ---------- updated_at triggers ----------
CREATE TRIGGER IF NOT EXISTS users_updated_at AFTER UPDATE ON users
  FOR EACH ROW BEGIN UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id; END;
CREATE TRIGGER IF NOT EXISTS equipment_updated_at AFTER UPDATE ON equipment
  FOR EACH ROW BEGIN UPDATE equipment SET updated_at = datetime('now') WHERE id = NEW.id; END;
CREATE TRIGGER IF NOT EXISTS checkout_requests_updated_at AFTER UPDATE ON checkout_requests
  FOR EACH ROW BEGIN UPDATE checkout_requests SET updated_at = datetime('now') WHERE id = NEW.id; END;
