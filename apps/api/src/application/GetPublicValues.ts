import type {
  AppRepository,
  EnvironmentRepository,
  FeatureToggleRepository,
  ToggleValueRepository,
} from "@semaforo/domain";
import type { ToggleCache } from "../infrastructure/cache/RedisToggleCache.js";

export class GetPublicValues {
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
    valueKey?: string;
  }): Promise<Record<string, string>> {
    const app = await this.appRepository.findByKey(params.appKey);
    if (!app) throw new Error("App not found");

    const environment = await this.environmentRepository.findByAppIdAndKey(
      app.id.value, params.envKey
    );
    if (!environment) throw new Error("Environment not found");

    const allToggles = await this.toggleRepository.findByAppId(app.id.value);
    const stringToggles = allToggles.filter((t) => t.type === "string");
    const values = await this.toggleValueRepository.findByEnvironmentId(environment.id.value);
    const valueByToggleId = new Map(values.map((v) => [v.toggleId, v]));

    if (params.valueKey) {
      const toggle = stringToggles.find((t) => t.key === params.valueKey);
      if (!toggle) return { [params.valueKey]: "" };
      const tv = valueByToggleId.get(toggle.id.value);
      return { [params.valueKey]: tv?.stringValue ?? "" };
    }

    const result: Record<string, string> = {};
    for (const toggle of stringToggles) {
      const tv = valueByToggleId.get(toggle.id.value);
      result[toggle.key] = tv?.stringValue ?? "";
    }

    return result;
  }
}
