import pg from "pg";
import { loadConfig } from "../config/env.js";
import { createExpressApp } from "../http/app.js";

const config = loadConfig();

export function createTestPool(): pg.Pool {
  return new pg.Pool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
  });
}

export function createTestApp(pool: pg.Pool) {
  return createExpressApp(pool, config);
}

export async function cleanDatabase(pool: pg.Pool) {
  await pool.query("DELETE FROM toggle_values");
  await pool.query("DELETE FROM feature_toggles");
  await pool.query("DELETE FROM environments");
  await pool.query("DELETE FROM apps");
  await pool.query("DELETE FROM users");
}
