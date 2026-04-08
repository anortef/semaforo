import type { ToggleValue, ToggleValueRepository } from "@semaforo/domain";
import type { JsonFileStore } from "./JsonFileStore.js";

export class JsonToggleValueRepository implements ToggleValueRepository {
  constructor(private store: JsonFileStore<ToggleValue>) {}

  async findByToggleAndEnvironment(toggleId: string, envId: string) {
    return this.store.findOne((v) => v.toggleId === toggleId && v.environmentId === envId);
  }
  async findByEnvironmentId(envId: string) {
    return this.store.filter((v) => v.environmentId === envId);
  }
  async save(value: ToggleValue) { await this.store.upsert(value); }
  async delete(id: string) { await this.store.remove((v) => v.id.value === id); }
}
