import type { ApiKey, ApiKeyRepository } from "@semaforo/domain";
import type { JsonFileStore } from "./JsonFileStore.js";

export class JsonApiKeyRepository implements ApiKeyRepository {
  constructor(private store: JsonFileStore<ApiKey>) {}

  async findById(id: string) { return this.store.findOne((k) => k.id.value === id); }
  async findByKey(key: string) { return this.store.findOne((k) => k.key === key); }
  async findByEnvironmentId(envId: string) { return this.store.filter((k) => k.environmentId === envId); }
  async save(apiKey: ApiKey) { await this.store.upsert(apiKey); }
  async delete(id: string) { await this.store.remove((k) => k.id.value === id); }
}
