import type { EnvironmentRepository, AppRepository } from "@semaforo/domain";
import type { ToggleCache } from "../infrastructure/cache/RedisToggleCache.js";
import type { SecretCache } from "../infrastructure/cache/SecretCache.js";

export class DeleteEnvironment {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private appRepository: AppRepository,
    private toggleCache: ToggleCache,
    private secretCache?: SecretCache
  ) {}

  async execute(id: string): Promise<void> {
    const env = await this.environmentRepository.findById(id);
    if (!env) {
      throw new Error("Environment not found");
    }

    const app = await this.appRepository.findById(env.appId);
    if (app) {
      await this.toggleCache.invalidate(app.key, env.key);
      await this.secretCache?.invalidate(app.key, env.key);
    }

    // CASCADE handles toggle_values, secret_values, api_keys, request_counts
    await this.environmentRepository.delete(id);
  }
}
