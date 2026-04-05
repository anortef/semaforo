import type { AppRepository, EnvironmentRepository, FeatureToggleRepository, RequestCountRepository } from "@semaforo/domain";
import type { ToggleCache, CacheInfo, RequestCounter } from "../infrastructure/cache/RedisToggleCache.js";

export interface RequestMetrics {
  current: number;
  last5m: number;
  last1h: number;
  last1d: number;
  last1w: number;
  last1mo: number;
}

export interface EnvironmentMetrics {
  id: string;
  name: string;
  key: string;
  cacheTtlSeconds: number;
  cache: CacheInfo | null;
  requests: RequestMetrics;
}

export interface AppMetrics {
  toggleCount: number;
  environments: EnvironmentMetrics[];
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

export class GetAppMetrics {
  constructor(
    private appRepository: AppRepository,
    private environmentRepository: EnvironmentRepository,
    private toggleRepository: FeatureToggleRepository,
    private cache: ToggleCache,
    private requestCounter?: RequestCounter,
    private requestCountRepository?: RequestCountRepository
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

    const now = new Date();
    const envIds = envs.map((e) => e.id.value);

    const [counts5m, counts1h, counts1d, counts1w, counts1mo] = await Promise.all([
      this.sumByIds(envIds, new Date(now.getTime() - 5 * MINUTE)),
      this.sumByIds(envIds, new Date(now.getTime() - HOUR)),
      this.sumByIds(envIds, new Date(now.getTime() - DAY)),
      this.sumByIds(envIds, new Date(now.getTime() - WEEK)),
      this.sumByIds(envIds, new Date(now.getTime() - MONTH)),
    ]);

    const environments = await Promise.all(
      envs.map(async (env) => {
        const current = await this.requestCounter?.getCurrentCount(env.id.value) ?? 0;
        return {
          id: env.id.value,
          name: env.name,
          key: env.key,
          cacheTtlSeconds: env.cacheTtlSeconds,
          cache: await this.cache.getCacheInfo(app.key, env.key),
          requests: {
            current,
            last5m: (counts5m.get(env.id.value) ?? 0) + current,
            last1h: (counts1h.get(env.id.value) ?? 0) + current,
            last1d: (counts1d.get(env.id.value) ?? 0) + current,
            last1w: (counts1w.get(env.id.value) ?? 0) + current,
            last1mo: (counts1mo.get(env.id.value) ?? 0) + current,
          },
        };
      })
    );

    return { toggleCount: toggles.length, environments };
  }

  private async sumByIds(envIds: string[], since: Date): Promise<Map<string, number>> {
    if (!this.requestCountRepository) return new Map();
    return this.requestCountRepository.sumByEnvironmentIds(envIds, since);
  }
}
