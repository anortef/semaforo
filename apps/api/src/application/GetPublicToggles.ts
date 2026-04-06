import {
  evaluateRollout,
  type AppRepository,
  type EnvironmentRepository,
  type FeatureToggleRepository,
  type ToggleValueRepository,
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
    userId?: string;
  }): Promise<Record<string, boolean | string>> {
    const app = await this.appRepository.findByKey(params.appKey);
    if (!app) throw new Error("App not found");

    const environment = await this.environmentRepository.findByAppIdAndKey(
      app.id.value, params.envKey
    );
    if (!environment) throw new Error("Environment not found");

    const toggles = await this.toggleRepository.findByAppId(app.id.value);
    const values = await this.toggleValueRepository.findByEnvironmentId(environment.id.value);
    const valueByToggleId = new Map(values.map((v) => [v.toggleId, v]));

    const hasRollout = values.some((v) => v.rolloutPercentage < 100);

    // Only use cache when no rollout and no single-toggle filter
    if (!hasRollout && !params.toggleKey) {
      const cached = await this.cache.get(params.appKey, params.envKey);
      if (cached) return cached;
    }

    if (params.toggleKey) {
      const toggle = toggles.find((t) => t.key === params.toggleKey);
      if (!toggle) return { [params.toggleKey]: false };
      const tv = valueByToggleId.get(toggle.id.value);
      return { [params.toggleKey]: this.resolveValue(toggle, tv, params.userId) };
    }

    const result: Record<string, boolean | string> = {};
    for (const toggle of toggles) {
      const tv = valueByToggleId.get(toggle.id.value);
      result[toggle.key] = this.resolveValue(toggle, tv, params.userId);
    }

    if (!hasRollout) {
      await this.cache.set(params.appKey, params.envKey, result, environment.cacheTtlSeconds);
    }

    return result;
  }

  private resolveValue(
    toggle: { key: string; type: string },
    tv: { enabled: boolean; stringValue: string; rolloutPercentage: number } | undefined,
    userId?: string
  ): boolean | string {
    if (toggle.type === "string") {
      return tv?.stringValue ?? "";
    }
    if (!tv) return false;
    if (tv.rolloutPercentage >= 100) return tv.enabled;
    if (!tv.enabled) return false;
    return evaluateRollout(tv.rolloutPercentage, toggle.key, userId);
  }
}
