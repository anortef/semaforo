import type { ApiKeyRepository } from "@semaforo/domain";

export class DeleteApiKey {
  constructor(private apiKeyRepository: ApiKeyRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.apiKeyRepository.findById(id);
    if (!existing) {
      throw new Error("API key not found");
    }
    await this.apiKeyRepository.delete(id);
  }
}
