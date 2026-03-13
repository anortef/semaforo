import type { Environment } from "../entities/Environment.js";

export interface EnvironmentRepository {
  findById(id: string): Promise<Environment | null>;
  findByAppId(appId: string): Promise<Environment[]>;
  findByAppIdAndKey(appId: string, key: string): Promise<Environment | null>;
  save(environment: Environment): Promise<void>;
  delete(id: string): Promise<void>;
}
