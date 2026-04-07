import type { AppRepository, EnvironmentRepository } from "@semaforo/domain";
import type { ToggleCache } from "../infrastructure/cache/RedisToggleCache.js";
import type { SecretCache } from "../infrastructure/cache/SecretCache.js";

export class DeleteApp {
  constructor(
    private appRepository: AppRepository,
    private environmentRepository: EnvironmentRepository,
    private toggleCache: ToggleCache,
    private secretCache?: SecretCache
  ) {}

  async execute(id: string): Promise<void> {
    const app = await this.appRepository.findById(id);
    if (!app) {
      throw new Error("App not found");
    }

    // Invalidate caches for all environments before deleting
    const envs = await this.environmentRepository.findByAppId(id);
    for (const env of envs) {
      await this.toggleCache.invalidate(app.key, env.key);
      await this.secretCache?.invalidate(app.key, env.key);
    }

    // CASCADE handles environments, toggles, toggle_values, secrets, secret_values, api_keys, app_members
    await this.appRepository.delete(id);
  }
}
