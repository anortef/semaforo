import crypto from "node:crypto";
import { createApiKey, type ApiKey, type ApiKeyRepository } from "@semaforo/domain";
import { v4 as uuid } from "uuid";

export class ListApiKeys {
  constructor(private apiKeyRepository: ApiKeyRepository) {}

  async execute(environmentId: string): Promise<ApiKey[]> {
    const keys = await this.apiKeyRepository.findByEnvironmentId(environmentId);
    if (keys.length > 0) {
      return keys;
    }

    const apiKey = createApiKey({
      id: uuid(),
      environmentId,
      name: uuid(),
      key: `sk_${crypto.randomBytes(24).toString("hex")}`,
    });
    await this.apiKeyRepository.save(apiKey);
    return [apiKey];
  }
}
