import crypto from "node:crypto";
import {
  createEnvironment,
  createApiKey,
  type Environment,
  type AppRepository,
  type EnvironmentRepository,
  type ApiKeyRepository,
} from "@semaforo/domain";
import { v4 as uuid } from "uuid";
import { hashApiKey } from "../infrastructure/crypto/hashApiKey.js";

export class CreateEnvironment {
  constructor(
    private appRepository: AppRepository,
    private environmentRepository: EnvironmentRepository,
    private apiKeyRepository?: ApiKeyRepository
  ) {}

  async execute(params: {
    appId: string;
    name: string;
    key: string;
  }): Promise<Environment> {
    const app = await this.appRepository.findById(params.appId);
    if (!app) {
      throw new Error("App not found");
    }

    const existing = await this.environmentRepository.findByAppIdAndKey(
      params.appId,
      params.key
    );
    if (existing) {
      throw new Error(
        `Environment with key "${params.key}" already exists in this app`
      );
    }

    const environment = createEnvironment({
      id: uuid(),
      appId: params.appId,
      name: params.name,
      key: params.key,
    });

    await this.environmentRepository.save(environment);

    if (this.apiKeyRepository) {
      const plaintext = `sk_${crypto.randomBytes(24).toString("hex")}`;
      const apiKey = createApiKey({
        id: uuid(),
        environmentId: environment.id.value,
        name: uuid(),
        keyHash: hashApiKey(plaintext),
      });
      await this.apiKeyRepository.save(apiKey);
    }

    return environment;
  }
}
