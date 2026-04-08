import type { SystemSetting, SystemSettingRepository } from "@semaforo/domain";
import type { JsonFileStore } from "./JsonFileStore.js";

export class JsonSystemSettingRepository implements SystemSettingRepository {
  constructor(private store: JsonFileStore<SystemSetting>) {}

  async findByKey(key: string) { return this.store.findOne((s) => s.key === key); }
  async findAll() { return this.store.getAll(); }
  async save(setting: SystemSetting) {
    // Upsert by key (not by id), matching Pg's ON CONFLICT (key) behavior
    const existing = this.store.findOne((s) => s.key === setting.key);
    if (existing) {
      await this.store.remove((s) => s.key === setting.key);
    }
    await this.store.upsert(setting);
  }
}
