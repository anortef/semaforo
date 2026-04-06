import type {
  AppRepository,
  EnvironmentRepository,
  SecretRepository,
  SecretValueRepository,
} from "@semaforo/domain";
import type { EncryptionService } from "../infrastructure/crypto/EncryptionService.js";
import type { SecretCache } from "../infrastructure/cache/SecretCache.js";

export class GetPublicSecrets {
  constructor(
    private appRepository: AppRepository,
    private environmentRepository: EnvironmentRepository,
    private secretRepository: SecretRepository,
    private secretValueRepository: SecretValueRepository,
    private encryptionService: EncryptionService,
    private cache: SecretCache
  ) {}

  async execute(params: {
    appKey: string;
    envKey: string;
  }): Promise<Record<string, string>> {
    const app = await this.appRepository.findByKey(params.appKey);
    if (!app) throw new Error("App not found");

    const environment = await this.environmentRepository.findByAppIdAndKey(
      app.id.value,
      params.envKey
    );
    if (!environment) throw new Error("Environment not found");

    const cached = await this.cache.get(params.appKey, params.envKey);
    if (cached) return cached;

    const secrets = await this.secretRepository.findByAppId(app.id.value);
    const values = await this.secretValueRepository.findByEnvironmentId(
      environment.id.value
    );
    const valueBySecretId = new Map(values.map((v) => [v.secretId, v]));

    const result: Record<string, string> = {};
    for (const secret of secrets) {
      const sv = valueBySecretId.get(secret.id.value);
      if (sv && sv.encryptedValue) {
        result[secret.key] = this.encryptionService.decrypt(sv.encryptedValue);
      } else {
        result[secret.key] = "";
      }
    }

    await this.cache.set(
      params.appKey,
      params.envKey,
      result,
      environment.cacheTtlSeconds
    );

    return result;
  }
}
