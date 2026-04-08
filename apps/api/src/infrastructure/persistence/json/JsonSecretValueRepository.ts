import type { SecretValue, SecretValueRepository } from "@semaforo/domain";
import type { JsonFileStore } from "./JsonFileStore.js";

export class JsonSecretValueRepository implements SecretValueRepository {
  constructor(private store: JsonFileStore<SecretValue>) {}

  async findBySecretAndEnvironment(secretId: string, envId: string) {
    return this.store.findOne((v) => v.secretId === secretId && v.environmentId === envId);
  }
  async findByEnvironmentId(envId: string) {
    return this.store.filter((v) => v.environmentId === envId);
  }
  async findBySecretId(secretId: string) {
    return this.store.filter((v) => v.secretId === secretId);
  }
  async save(value: SecretValue) { await this.store.upsert(value); }
  async delete(id: string) { await this.store.remove((v) => v.id.value === id); }
}
