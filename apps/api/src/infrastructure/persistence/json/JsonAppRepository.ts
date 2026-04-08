import type { App, AppRepository } from "@semaforo/domain";
import type { JsonFileStore } from "./JsonFileStore.js";
import type { CascadeHelper } from "./CascadeHelper.js";

export class JsonAppRepository implements AppRepository {
  constructor(private store: JsonFileStore<App>, private cascade: CascadeHelper) {}

  async findById(id: string) { return this.store.findOne((a) => a.id.value === id); }
  async findByKey(key: string) { return this.store.findOne((a) => a.key === key); }
  async findAll() { return this.store.getAll(); }
  async save(app: App) { await this.store.upsert(app); }
  async delete(id: string) {
    await this.cascade.cascadeDeleteApp(id);
    await this.store.remove((a) => a.id.value === id);
  }
}
