import type { ApiKey, ApiKeyRepository } from "@semaforo/domain";

export class ValidateApiKey {
  constructor(private apiKeyRepository: ApiKeyRepository) {}

  async execute(key: string): Promise<ApiKey | null> {
    if (!key) return null;
    return this.apiKeyRepository.findByKey(key);
  }
}
