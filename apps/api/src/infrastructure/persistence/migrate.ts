import pg from "pg";
import { loadConfig } from "../config/env.js";

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS apps (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    key TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS environments (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(app_id, key)
  )`,
  `CREATE TABLE IF NOT EXISTS feature_toggles (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(app_id, key)
  )`,
  `CREATE TABLE IF NOT EXISTS toggle_values (
    id TEXT PRIMARY KEY,
    toggle_id TEXT NOT NULL REFERENCES feature_toggles(id) ON DELETE CASCADE,
    environment_id TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(toggle_id, environment_id)
  )`,
  `ALTER TABLE environments ADD COLUMN IF NOT EXISTS cache_ttl_seconds INTEGER NOT NULL DEFAULT 300`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'`,
  `CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    environment_id TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id)`,
  `CREATE TABLE IF NOT EXISTS app_members (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(app_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS request_counts (
    id TEXT PRIMARY KEY,
    environment_id TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    count INTEGER NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_request_counts_env_window ON request_counts(environment_id, window_end DESC)`,
  `ALTER TABLE feature_toggles ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'boolean'`,
  `ALTER TABLE toggle_values ADD COLUMN IF NOT EXISTS string_value TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE toggle_values ADD COLUMN IF NOT EXISTS rollout_percentage INTEGER NOT NULL DEFAULT 100`,
];

async function migrate() {
  const config = loadConfig();
  const pool = new pg.Pool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
  });

  console.log("Running migrations...");

  for (const sql of MIGRATIONS) {
    await pool.query(sql);
  }

  console.log("Migrations complete.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
