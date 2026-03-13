import pg from "pg";
import type { Config } from "../config/env.js";

export function createPool(config: Config["database"]): pg.Pool {
  return new pg.Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.name,
  });
}
