import type { Secret } from "../entities/Secret.js";

export interface SecretRepository {
  findById(id: string): Promise<Secret | null>;
  findByAppId(appId: string): Promise<Secret[]>;
  findByAppIdAndKey(appId: string, key: string): Promise<Secret | null>;
  save(secret: Secret): Promise<void>;
  delete(id: string): Promise<void>;
}
