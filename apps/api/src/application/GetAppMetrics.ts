import type { AppRepository, EnvironmentRepository, FeatureToggleRepository } from "@semaforo/domain";
import type { ToggleCache, CacheInfo } from "../infrastructure/cache/RedisToggleCache.js";

export interface EnvironmentMetrics {
  id: string;
  name: string;
  key: string;
  cacheTtlSeconds: number;
  cache: CacheInfo | null;
}

export interface AppMetrics {
  toggleCount: number;
  environments: EnvironmentMetrics[];
}

export class GetAppMetrics {
  constructor(
    private appRepository: AppRepository,
    private environmentRepository: EnvironmentRepository,
    private toggleRepository: FeatureToggleRepository,
    private cache: ToggleCache
  ) {}

  async execute(appId: string): Promise<AppMetrics> {
    const app = await this.appRepository.findById(appId);
    if (!app) {
      throw new Error("App not found");
    }

    const [toggles, envs] = await Promise.all([
      this.toggleRepository.findByAppId(appId),
      this.environmentRepository.findByAppId(appId),
    ]);

    const environments = await Promise.all(
      envs.map(async (env) => ({
        id: env.id.value,
        name: env.name,
        key: env.key,
        cacheTtlSeconds: env.cacheTtlSeconds,
        cache: await this.cache.getCacheInfo(app.key, env.key),
      }))
    );

    return { toggleCount: toggles.length, environments };
  }
}
