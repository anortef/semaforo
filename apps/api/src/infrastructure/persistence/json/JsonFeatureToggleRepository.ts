import type { FeatureToggle, FeatureToggleRepository } from "@semaforo/domain";
import type { JsonFileStore } from "./JsonFileStore.js";
import type { CascadeHelper } from "./CascadeHelper.js";

export class JsonFeatureToggleRepository implements FeatureToggleRepository {
  constructor(private store: JsonFileStore<FeatureToggle>, private cascade: CascadeHelper) {}

  async findById(id: string) { return this.store.findOne((t) => t.id.value === id); }
  async findByAppId(appId: string) { return this.store.filter((t) => t.appId === appId); }
  async findByAppIdAndKey(appId: string, key: string) {
    return this.store.findOne((t) => t.appId === appId && t.key === key);
  }
  async save(toggle: FeatureToggle) { await this.store.upsert(toggle); }
  async delete(id: string) {
    await this.cascade.cascadeDeleteToggle(id);
    await this.store.remove((t) => t.id.value === id);
  }
}
