import pg from "pg";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import { loadConfig } from "../config/env.js";
import { createExpressApp } from "../http/app.js";
import { NoOpToggleCache } from "../cache/RedisToggleCache.js";
import { createUser } from "@semaforo/domain";
import { PgUserRepository } from "../persistence/PgUserRepository.js";

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
  return createExpressApp(pool, config, new NoOpToggleCache());
}

export async function cleanDatabase(pool: pg.Pool) {
  await pool.query("DELETE FROM request_counts");
  await pool.query("DELETE FROM audit_log");
  await pool.query("DELETE FROM system_settings");
  await pool.query("DELETE FROM app_members");
  await pool.query("DELETE FROM secret_values");
  await pool.query("DELETE FROM secrets");
  await pool.query("DELETE FROM toggle_values");
  await pool.query("DELETE FROM feature_toggles");
  await pool.query("DELETE FROM api_keys");
  await pool.query("DELETE FROM environments");
  await pool.query("DELETE FROM apps");
  await pool.query("DELETE FROM users");
}

export async function seedTestAdmin(pool: pg.Pool): Promise<void> {
  const userRepo = new PgUserRepository(pool);
  const hash = await bcrypt.hash("admin", 10);
  const admin = createUser({
    id: uuid(),
    email: "admin@semaforo.local",
    name: "Admin",
    passwordHash: hash,
    role: "admin",
  });
  await userRepo.save(admin);
}

