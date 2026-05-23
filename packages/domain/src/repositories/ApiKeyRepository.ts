import type { ApiKey } from "../entities/ApiKey.js";

export interface ApiKeyRepository {
  findById(id: string): Promise<ApiKey | null>;
  findByKeyHash(keyHash: string): Promise<ApiKey | null>;
  findByEnvironmentId(environmentId: string): Promise<ApiKey[]>;
  save(apiKey: ApiKey): Promise<void>;
  delete(id: string): Promise<void>;
}
