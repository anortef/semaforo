import {
  updateEnvironment,
  type Environment,
  type EnvironmentRepository,
} from "@semaforo/domain";

export class UpdateEnvironment {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(params: {
    environmentId: string;
    name?: string;
    cacheTtlSeconds?: number;
  }): Promise<Environment> {
    const env = await this.environmentRepository.findById(params.environmentId);
    if (!env) {
      throw new Error("Environment not found");
    }

    const updated = updateEnvironment(env, {
      name: params.name,
      cacheTtlSeconds: params.cacheTtlSeconds,
    });

    await this.environmentRepository.save(updated);
    return updated;
  }
}
