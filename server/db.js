import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "freshmarket.db");

const db = new Database(DB_PATH);

// Enable WAL mode for fast concurrent reads
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    phone       TEXT DEFAULT '',
    password_hash TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'user',
    address_json TEXT DEFAULT '{}',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    orderable   INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS products (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    category      TEXT NOT NULL DEFAULT 'Sprouts',
    price         REAL NOT NULL,
    stock         INTEGER NOT NULL DEFAULT 0,
    unit          TEXT NOT NULL DEFAULT '250g',
    description   TEXT DEFAULT '',
    image_url     TEXT DEFAULT NULL,
    popular       INTEGER NOT NULL DEFAULT 0,
    clearance     INTEGER NOT NULL DEFAULT 0,
    clearance_price REAL DEFAULT 0,
    orderable     INTEGER NOT NULL DEFAULT 1,
    rating        REAL DEFAULT 4.5,
    review_count  INTEGER DEFAULT 0,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS orders (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'Requested',
    total       REAL NOT NULL DEFAULT 0,
    delivery    REAL NOT NULL DEFAULT 0,
    discount    REAL NOT NULL DEFAULT 0,
    pay_method  TEXT NOT NULL DEFAULT 'upi',
    address_json TEXT DEFAULT '{}',
    items_json  TEXT DEFAULT '[]',
    timestamp   INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS flash_deals (
    id          TEXT PRIMARY KEY,
    product_id  INTEGER NOT NULL,
    discount    REAL NOT NULL DEFAULT 20,
    ends_at     INTEGER NOT NULL,
    label       TEXT DEFAULT 'Flash Deal',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS offers (
    id      TEXT PRIMARY KEY,
    title   TEXT NOT NULL,
    description TEXT DEFAULT '',
    active  INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS quality_reports (
    id        TEXT PRIMARY KEY,
    order_id  TEXT NOT NULL,
    issues_json TEXT DEFAULT '[]',
    description TEXT DEFAULT '',
    timestamp INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id          TEXT PRIMARY KEY,
    product_id  INTEGER NOT NULL,
    user_id     TEXT NOT NULL,
    order_id    TEXT,
    rating      INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment     TEXT DEFAULT '',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// ── Seed default settings ─────────────────────────────────
try {
  db.prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)").run("rating_mode", "curated");
} catch { }

// ── Add reset-password columns (safe on existing DBs) ────────
try { db.exec("ALTER TABLE users ADD COLUMN reset_token TEXT DEFAULT NULL"); } catch { }
try { db.exec("ALTER TABLE users ADD COLUMN reset_expires INTEGER DEFAULT NULL"); } catch { }

// ── Add product gallery + bilingual benefits columns ──────────
try { db.exec("ALTER TABLE products ADD COLUMN images_json TEXT DEFAULT '[]'"); } catch { }
try { db.exec("ALTER TABLE products ADD COLUMN benefits_en TEXT DEFAULT ''"); } catch { }
try { db.exec("ALTER TABLE products ADD COLUMN benefits_ta TEXT DEFAULT ''"); } catch { }

// ── Add orderable column (safe on existing DBs) ──────────────
try { db.exec("ALTER TABLE products ADD COLUMN orderable INTEGER NOT NULL DEFAULT 1"); } catch { }

export default db;
