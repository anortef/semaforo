import type {
  FeatureToggleRepository,
  AppRepository,
  EnvironmentRepository,
} from "@semaforo/domain";
import type { ToggleCache } from "../infrastructure/cache/RedisToggleCache.js";

export class DeleteFeatureToggle {
  constructor(
    private toggleRepository: FeatureToggleRepository,
    private appRepository: AppRepository,
    private environmentRepository: EnvironmentRepository,
    private cache: ToggleCache
  ) {}

  async execute(id: string): Promise<void> {
    const toggle = await this.toggleRepository.findById(id);
    if (!toggle) {
      throw new Error("Toggle not found");
    }

    // CASCADE handles toggle_values cleanup
    await this.toggleRepository.delete(id);

    // Invalidate cache for all environments of this app
    const app = await this.appRepository.findById(toggle.appId);
    if (app) {
      const envs = await this.environmentRepository.findByAppId(app.id.value);
      for (const env of envs) {
        await this.cache.invalidate(app.key, env.key);
      }
    }
  }
}
