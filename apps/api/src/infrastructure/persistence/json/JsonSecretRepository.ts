import type { Secret, SecretRepository } from "@semaforo/domain";
import type { JsonFileStore } from "./JsonFileStore.js";
import type { CascadeHelper } from "./CascadeHelper.js";

export class JsonSecretRepository implements SecretRepository {
  constructor(private store: JsonFileStore<Secret>, private cascade: CascadeHelper) {}

  async findById(id: string) { return this.store.findOne((s) => s.id.value === id); }
  async findByAppId(appId: string) { return this.store.filter((s) => s.appId === appId); }
  async findByAppIdAndKey(appId: string, key: string) {
    return this.store.findOne((s) => s.appId === appId && s.key === key);
  }
  async save(secret: Secret) { await this.store.upsert(secret); }
  async delete(id: string) {
    await this.cascade.cascadeDeleteSecret(id);
    await this.store.remove((s) => s.id.value === id);
  }
}
