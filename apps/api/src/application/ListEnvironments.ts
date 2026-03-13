import type { Environment, EnvironmentRepository } from "@semaforo/domain";

export class ListEnvironments {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(appId: string): Promise<Environment[]> {
    return this.environmentRepository.findByAppId(appId);
  }
}
