import type { ApiKey, ApiKeyRepository } from "@semaforo/domain";

export class ListApiKeys {
  constructor(private apiKeyRepository: ApiKeyRepository) {}

  async execute(appId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.findByAppId(appId);
  }
}
