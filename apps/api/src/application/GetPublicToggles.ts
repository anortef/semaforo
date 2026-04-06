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
  }): Promise<Record<string, boolean | string>> {
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

    const valueByToggleId = new Map(values.map((v) => [v.toggleId, v]));

    if (params.toggleKey) {
      const toggle = toggles.find((t) => t.key === params.toggleKey);
      if (!toggle) return { [params.toggleKey]: false };
      const tv = valueByToggleId.get(toggle.id.value);
      const val = toggle.type === "string"
        ? (tv?.stringValue ?? "")
        : (tv?.enabled ?? false);
      return { [params.toggleKey]: val };
    }

    const result: Record<string, boolean | string> = {};
    for (const toggle of toggles) {
      const tv = valueByToggleId.get(toggle.id.value);
      result[toggle.key] = toggle.type === "string"
        ? (tv?.stringValue ?? "")
        : (tv?.enabled ?? false);
    }

    await this.cache.set(
      params.appKey,
      params.envKey,
      result,
      environment.cacheTtlSeconds
    );

    return result;
  }
}
