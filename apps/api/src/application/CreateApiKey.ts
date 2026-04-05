import crypto from "node:crypto";
import { createApiKey, type ApiKey, type ApiKeyRepository, type EnvironmentRepository } from "@semaforo/domain";
import { v4 as uuid } from "uuid";

function generateKey(): string {
  return `sk_${crypto.randomBytes(24).toString("hex")}`;
}

export class CreateApiKey {
  constructor(
    private apiKeyRepository: ApiKeyRepository,
    private environmentRepository: EnvironmentRepository
  ) {}

  async execute(params: { environmentId: string }): Promise<ApiKey> {
    const env = await this.environmentRepository.findById(params.environmentId);
    if (!env) {
      throw new Error("Environment not found");
    }

    const apiKey = createApiKey({
      id: uuid(),
      environmentId: params.environmentId,
      name: uuid(),
      key: generateKey(),
    });

    await this.apiKeyRepository.save(apiKey);
    return apiKey;
  }
}
