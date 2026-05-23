import type { ApiKey, ApiKeyRepository } from "@semaforo/domain";
import { hashApiKey } from "../infrastructure/crypto/hashApiKey.js";

export class ValidateApiKey {
  constructor(private apiKeyRepository: ApiKeyRepository) {}

  async execute(plaintextKey: string): Promise<ApiKey | null> {
    if (!plaintextKey) return null;
    return this.apiKeyRepository.findByKeyHash(hashApiKey(plaintextKey));
  }
}
