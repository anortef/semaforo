import type { Environment, EnvironmentRepository } from "@semaforo/domain";
import type { JsonFileStore } from "./JsonFileStore.js";
import type { CascadeHelper } from "./CascadeHelper.js";

export class JsonEnvironmentRepository implements EnvironmentRepository {
  constructor(private store: JsonFileStore<Environment>, private cascade: CascadeHelper) {}

  async findById(id: string) { return this.store.findOne((e) => e.id.value === id); }
  async findByAppId(appId: string) { return this.store.filter((e) => e.appId === appId); }
  async findByAppIdAndKey(appId: string, key: string) {
    return this.store.findOne((e) => e.appId === appId && e.key === key);
  }
  async save(env: Environment) { await this.store.upsert(env); }
  async delete(id: string) {
    await this.cascade.cascadeDeleteEnvironment(id);
    await this.store.remove((e) => e.id.value === id);
  }
}
