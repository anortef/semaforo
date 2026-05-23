import crypto from "node:crypto";
import { createApiKey, type ApiKey, type ApiKeyRepository } from "@semaforo/domain";
import { v4 as uuid } from "uuid";
import { hashApiKey } from "../infrastructure/crypto/hashApiKey.js";

// Result for ListApiKeys: returns stored keys (no plaintext) and, if a new
// key was auto-provisioned during this call, the one-time plaintext for it.
export interface ListedApiKeys {
  keys: ApiKey[];
  freshPlaintext?: string;
}

export class ListApiKeys {
  constructor(private apiKeyRepository: ApiKeyRepository) {}

  async execute(environmentId: string): Promise<ListedApiKeys> {
    const existing = await this.apiKeyRepository.findByEnvironmentId(environmentId);
    if (existing.length > 0) {
      return { keys: existing };
    }

    const plaintext = `sk_${crypto.randomBytes(24).toString("hex")}`;
    const apiKey = createApiKey({
      id: uuid(),
      environmentId,
      name: uuid(),
      keyHash: hashApiKey(plaintext),
    });
    await this.apiKeyRepository.save(apiKey);
    return { keys: [apiKey], freshPlaintext: plaintext };
  }
}
