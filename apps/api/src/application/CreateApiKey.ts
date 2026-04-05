import crypto from "node:crypto";
import { createApiKey, type ApiKey, type ApiKeyRepository, type AppRepository } from "@semaforo/domain";
import { v4 as uuid } from "uuid";

function generateKey(): string {
  return `sk_${crypto.randomBytes(24).toString("hex")}`;
}

export class CreateApiKey {
  constructor(
    private apiKeyRepository: ApiKeyRepository,
    private appRepository: AppRepository
  ) {}

  async execute(params: {
    appId: string;
    name: string;
  }): Promise<ApiKey> {
    const app = await this.appRepository.findById(params.appId);
    if (!app) {
      throw new Error("App not found");
    }

    const apiKey = createApiKey({
      id: uuid(),
      appId: params.appId,
      name: params.name,
      key: generateKey(),
    });

    await this.apiKeyRepository.save(apiKey);
    return apiKey;
  }
}
