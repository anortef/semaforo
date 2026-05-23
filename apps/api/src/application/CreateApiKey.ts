import crypto from "node:crypto";
import { createApiKey, type ApiKey, type ApiKeyRepository, type EnvironmentRepository } from "@semaforo/domain";
import { v4 as uuid } from "uuid";
import { hashApiKey } from "../infrastructure/crypto/hashApiKey.js";

function generatePlaintextKey(): string {
  return `sk_${crypto.randomBytes(24).toString("hex")}`;
}

// The plaintext key is shown to the caller exactly once at creation time;
// only the hash is persisted. Subsequent listings will never see the plaintext.
export interface NewApiKey {
  apiKey: ApiKey;
  plaintext: string;
}

export class CreateApiKey {
  constructor(
    private apiKeyRepository: ApiKeyRepository,
    private environmentRepository: EnvironmentRepository
  ) {}

  async execute(params: { environmentId: string }): Promise<NewApiKey> {
    const env = await this.environmentRepository.findById(params.environmentId);
    if (!env) {
      throw new Error("Environment not found");
    }

    const plaintext = generatePlaintextKey();
    const apiKey = createApiKey({
      id: uuid(),
      environmentId: params.environmentId,
      name: uuid(),
      keyHash: hashApiKey(plaintext),
    });

    await this.apiKeyRepository.save(apiKey);
    return { apiKey, plaintext };
  }
}
