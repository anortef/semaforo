import {
  createSecretValue,
  updateSecretValue,
  type SecretValue,
  type AppRepository,
  type SecretRepository,
  type EnvironmentRepository,
  type SecretValueRepository,
} from "@semaforo/domain";
import { v4 as uuid } from "uuid";
import type { EncryptionService } from "../infrastructure/crypto/EncryptionService.js";
import type { SecretCache } from "../infrastructure/cache/SecretCache.js";

export class SetSecretValue {
  constructor(
    private secretRepository: SecretRepository,
    private environmentRepository: EnvironmentRepository,
    private secretValueRepository: SecretValueRepository,
    private appRepository: AppRepository,
    private encryptionService: EncryptionService,
    private cache: SecretCache
  ) {}

  async execute(params: {
    secretId: string;
    environmentId: string;
    plainValue: string;
  }): Promise<SecretValue> {
    const secret = await this.secretRepository.findById(params.secretId);
    if (!secret) {
      throw new Error("Secret not found");
    }

    const environment = await this.environmentRepository.findById(
      params.environmentId
    );
    if (!environment) {
      throw new Error("Environment not found");
    }

    if (secret.appId !== environment.appId) {
      throw new Error("Secret and environment belong to different apps");
    }

    const encryptedValue = this.encryptionService.encrypt(params.plainValue);

    const existing =
      await this.secretValueRepository.findBySecretAndEnvironment(
        params.secretId,
        params.environmentId
      );

    let result: SecretValue;

    if (existing) {
      result = updateSecretValue(existing, { encryptedValue });
      await this.secretValueRepository.save(result);
    } else {
      result = createSecretValue({
        id: uuid(),
        secretId: params.secretId,
        environmentId: params.environmentId,
        encryptedValue,
      });
      await this.secretValueRepository.save(result);
    }

    // Invalidate cache for this app+environment
    const app = await this.appRepository.findById(secret.appId);
    if (app) {
      await this.cache.invalidate(app.key, environment.key);
    }

    return result;
  }
}
