import {
  updateEnvironment,
  type Environment,
  type AppRepository,
  type EnvironmentRepository,
} from "@semaforo/domain";
import type { ToggleCache } from "../infrastructure/cache/RedisToggleCache.js";

export class UpdateEnvironment {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private appRepository: AppRepository,
    private cache: ToggleCache
  ) {}

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

    // Invalidate cache when TTL changes (especially to 0)
    if (params.cacheTtlSeconds !== undefined) {
      const app = await this.appRepository.findById(env.appId);
      if (app) {
        await this.cache.invalidate(app.key, env.key);
      }
    }

    return updated;
  }
}
