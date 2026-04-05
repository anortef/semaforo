import type {
  AppRepository,
  EnvironmentRepository,
  FeatureToggleRepository,
  ToggleValueRepository,
} from "@semaforo/domain";
import type { ToggleCache } from "../infrastructure/cache/RedisToggleCache.js";

export class GetPublicToggles {
  constructor(
    private appRepository: AppRepository,
    private environmentRepository: EnvironmentRepository,
    private toggleRepository: FeatureToggleRepository,
    private toggleValueRepository: ToggleValueRepository,
    private cache: ToggleCache
  ) {}

  async execute(params: {
    appKey: string;
    envKey: string;
    toggleKey?: string;
  }): Promise<Record<string, boolean>> {
    // Try cache first (only for full map, not filtered)
    if (!params.toggleKey) {
      const cached = await this.cache.get(params.appKey, params.envKey);
      if (cached) return cached;
    }

    const app = await this.appRepository.findByKey(params.appKey);
    if (!app) {
      throw new Error("App not found");
    }

    const environment = await this.environmentRepository.findByAppIdAndKey(
      app.id.value,
      params.envKey
    );
    if (!environment) {
      throw new Error("Environment not found");
    }

    const toggles = await this.toggleRepository.findByAppId(app.id.value);
    const values = await this.toggleValueRepository.findByEnvironmentId(
      environment.id.value
    );

    const valueMap = new Map(values.map((v) => [v.toggleId, v.enabled]));

    if (params.toggleKey) {
      const toggle = toggles.find((t) => t.key === params.toggleKey);
      const enabled = toggle ? (valueMap.get(toggle.id.value) ?? false) : false;
      return { [params.toggleKey]: enabled };
    }

    const result: Record<string, boolean> = {};
    for (const toggle of toggles) {
      result[toggle.key] = valueMap.get(toggle.id.value) ?? false;
    }

    // Cache the full result
    await this.cache.set(
      params.appKey,
      params.envKey,
      result,
      environment.cacheTtlSeconds
    );

    return result;
  }
}
