import type {
  App, AppRepository,
  Environment, EnvironmentRepository,
  FeatureToggle, FeatureToggleRepository,
  ToggleValue, ToggleValueRepository,
  ApiKey, ApiKeyRepository,
  Secret, SecretRepository,
  SecretValue, SecretValueRepository,
} from "@semaforo/domain";
import type { ToggleCache } from "../../infrastructure/cache/RedisToggleCache.js";
import type { SecretCache } from "../../infrastructure/cache/SecretCache.js";
import type { EncryptionService } from "../../infrastructure/crypto/EncryptionService.js";

export class InMemoryAppRepository implements AppRepository {
  apps: App[] = [];
  async findById(id: string) { return this.apps.find((a) => a.id.value === id) ?? null; }
  async findByKey(key: string) { return this.apps.find((a) => a.key === key) ?? null; }
  async findAll() { return [...this.apps]; }
  async save(app: App) {
    const idx = this.apps.findIndex((a) => a.id.value === app.id.value);
    if (idx >= 0) this.apps[idx] = app; else this.apps.push(app);
  }
  async delete(id: string) { this.apps = this.apps.filter((a) => a.id.value !== id); }
}

export class InMemoryEnvironmentRepository implements EnvironmentRepository {
  envs: Environment[] = [];
  async findById(id: string) { return this.envs.find((e) => e.id.value === id) ?? null; }
  async findByAppId(appId: string) { return this.envs.filter((e) => e.appId === appId); }
  async findByAppIdAndKey(appId: string, key: string) {
    return this.envs.find((e) => e.appId === appId && e.key === key) ?? null;
  }
  async save(env: Environment) {
    const idx = this.envs.findIndex((e) => e.id.value === env.id.value);
    if (idx >= 0) this.envs[idx] = env; else this.envs.push(env);
  }
  async delete(id: string) { this.envs = this.envs.filter((e) => e.id.value !== id); }
}

export class InMemoryFeatureToggleRepository implements FeatureToggleRepository {
  toggles: FeatureToggle[] = [];
  async findById(id: string) { return this.toggles.find((t) => t.id.value === id) ?? null; }
  async findByAppId(appId: string) { return this.toggles.filter((t) => t.appId === appId); }
  async findByAppIdAndKey(appId: string, key: string) {
    return this.toggles.find((t) => t.appId === appId && t.key === key) ?? null;
  }
  async save(toggle: FeatureToggle) {
    const idx = this.toggles.findIndex((t) => t.id.value === toggle.id.value);
    if (idx >= 0) this.toggles[idx] = toggle; else this.toggles.push(toggle);
  }
  async delete(id: string) { this.toggles = this.toggles.filter((t) => t.id.value !== id); }
}

export class InMemoryToggleValueRepository implements ToggleValueRepository {
  values: ToggleValue[] = [];
  async findByToggleAndEnvironment(toggleId: string, envId: string) {
    return this.values.find((v) => v.toggleId === toggleId && v.environmentId === envId) ?? null;
  }
  async findByEnvironmentId(envId: string) {
    return this.values.filter((v) => v.environmentId === envId);
  }
  async save(value: ToggleValue) {
    const idx = this.values.findIndex((v) => v.id.value === value.id.value);
    if (idx >= 0) this.values[idx] = value; else this.values.push(value);
  }
  async delete(id: string) { this.values = this.values.filter((v) => v.id.value !== id); }
}

export class InMemoryApiKeyRepository implements ApiKeyRepository {
  keys: ApiKey[] = [];
  async findById(id: string) { return this.keys.find((k) => k.id.value === id) ?? null; }
  async findByKey(key: string) { return this.keys.find((k) => k.key === key) ?? null; }
  async findByEnvironmentId(envId: string) { return this.keys.filter((k) => k.environmentId === envId); }
  async save(apiKey: ApiKey) {
    const idx = this.keys.findIndex((k) => k.id.value === apiKey.id.value);
    if (idx >= 0) this.keys[idx] = apiKey; else this.keys.push(apiKey);
  }
  async delete(id: string) { this.keys = this.keys.filter((k) => k.id.value !== id); }
}

export class SpyToggleCache implements ToggleCache {
  invalidated: string[] = [];
  async get() { return null; }
  async set() {}
  async invalidate(appKey: string, envKey: string) { this.invalidated.push(`${appKey}:${envKey}`); }
  async getByApiKey() { return null; }
  async setByApiKey() {}
  async getCacheInfo() { return null; }
}

export class InMemorySecretRepository implements SecretRepository {
  secrets: Secret[] = [];
  async findById(id: string) { return this.secrets.find((s) => s.id.value === id) ?? null; }
  async findByAppId(appId: string) { return this.secrets.filter((s) => s.appId === appId); }
  async findByAppIdAndKey(appId: string, key: string) {
    return this.secrets.find((s) => s.appId === appId && s.key === key) ?? null;
  }
  async save(secret: Secret) {
    const idx = this.secrets.findIndex((s) => s.id.value === secret.id.value);
    if (idx >= 0) this.secrets[idx] = secret; else this.secrets.push(secret);
  }
  async delete(id: string) { this.secrets = this.secrets.filter((s) => s.id.value !== id); }
}

export class InMemorySecretValueRepository implements SecretValueRepository {
  values: SecretValue[] = [];
  async findBySecretAndEnvironment(secretId: string, envId: string) {
    return this.values.find((v) => v.secretId === secretId && v.environmentId === envId) ?? null;
  }
  async findByEnvironmentId(envId: string) {
    return this.values.filter((v) => v.environmentId === envId);
  }
  async findBySecretId(secretId: string) {
    return this.values.filter((v) => v.secretId === secretId);
  }
  async save(value: SecretValue) {
    const idx = this.values.findIndex((v) => v.id.value === value.id.value);
    if (idx >= 0) this.values[idx] = value; else this.values.push(value);
  }
  async delete(id: string) { this.values = this.values.filter((v) => v.id.value !== id); }
}

export class SpySecretCache implements SecretCache {
  invalidated: string[] = [];
  data = new Map<string, Record<string, string>>();
  async get(appKey: string, envKey: string) { return this.data.get(`${appKey}:${envKey}`) ?? null; }
  async set(appKey: string, envKey: string, secrets: Record<string, string>) {
    this.data.set(`${appKey}:${envKey}`, secrets);
  }
  async invalidate(appKey: string, envKey: string) { this.invalidated.push(`${appKey}:${envKey}`); this.data.delete(`${appKey}:${envKey}`); }
}

export class FakeEncryptionService implements EncryptionService {
  encrypt(plaintext: string): string { return Buffer.from(plaintext).toString("base64"); }
  decrypt(encrypted: string): string { return Buffer.from(encrypted, "base64").toString("utf8"); }
}
