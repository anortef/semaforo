import {
  createToggleValue,
  updateToggleValue,
  type ToggleValue,
  type AppRepository,
  type FeatureToggleRepository,
  type EnvironmentRepository,
  type ToggleValueRepository,
} from "@semaforo/domain";
import { v4 as uuid } from "uuid";
import type { ToggleCache } from "../infrastructure/cache/RedisToggleCache.js";

export class SetToggleValue {
  constructor(
    private toggleRepository: FeatureToggleRepository,
    private environmentRepository: EnvironmentRepository,
    private toggleValueRepository: ToggleValueRepository,
    private appRepository: AppRepository,
    private cache: ToggleCache
  ) {}

  async execute(params: {
    toggleId: string;
    environmentId: string;
    enabled?: boolean;
    stringValue?: string;
  }): Promise<ToggleValue> {
    const toggle = await this.toggleRepository.findById(params.toggleId);
    if (!toggle) {
      throw new Error("Toggle not found");
    }

    const environment = await this.environmentRepository.findById(
      params.environmentId
    );
    if (!environment) {
      throw new Error("Environment not found");
    }

    if (toggle.appId !== environment.appId) {
      throw new Error("Toggle and environment belong to different apps");
    }

    const existing =
      await this.toggleValueRepository.findByToggleAndEnvironment(
        params.toggleId,
        params.environmentId
      );

    let result: ToggleValue;

    if (existing) {
      result = updateToggleValue(existing, {
        enabled: params.enabled,
        stringValue: params.stringValue,
      });
      await this.toggleValueRepository.save(result);
    } else {
      result = createToggleValue({
        id: uuid(),
        toggleId: params.toggleId,
        environmentId: params.environmentId,
        enabled: params.enabled,
        stringValue: params.stringValue,
      });
      await this.toggleValueRepository.save(result);
    }

    // Invalidate cache for this app+environment
    const app = await this.appRepository.findById(toggle.appId);
    if (app) {
      await this.cache.invalidate(app.key, environment.key);
    }

    return result;
  }
}
