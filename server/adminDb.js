import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_DB_PATH = path.join(__dirname, "..", "freshmarket_admin.db");

const adminDb = new Database(ADMIN_DB_PATH);

// Enable WAL for fast concurrent reads
adminDb.pragma("journal_mode = WAL");
adminDb.pragma("foreign_keys = ON");

// ── Admin-only schema ─────────────────────────────────────
adminDb.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id              TEXT PRIMARY KEY,
    username        TEXT NOT NULL UNIQUE,
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until    INTEGER DEFAULT NULL,
    last_login      INTEGER DEFAULT NULL,
    last_login_ip   TEXT DEFAULT NULL,
    created_at      INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    id            TEXT PRIMARY KEY,
    admin_id      TEXT NOT NULL,
    token_hash    TEXT NOT NULL,
    ip_address    TEXT,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at    INTEGER NOT NULL,
    FOREIGN KEY(admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS admin_audit_log (
    id          TEXT PRIMARY KEY,
    admin_id    TEXT NOT NULL,
    action      TEXT NOT NULL,
    details     TEXT DEFAULT '',
    ip_address  TEXT,
    timestamp   INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

// ── Add reset-password columns (safe on existing DBs) ────────
try { adminDb.exec("ALTER TABLE admin_users ADD COLUMN reset_token TEXT DEFAULT NULL"); } catch {}
try { adminDb.exec("ALTER TABLE admin_users ADD COLUMN reset_expires INTEGER DEFAULT NULL"); } catch {}

export default adminDb;
