import type { Secret, SecretRepository } from "@semaforo/domain";

export class ListSecrets {
  constructor(private secretRepository: SecretRepository) {}

  async execute(appId: string): Promise<Secret[]> {
    return this.secretRepository.findByAppId(appId);
  }
}
