import type {
  SecretRepository,
  AppRepository,
  EnvironmentRepository,
} from "@semaforo/domain";
import type { SecretCache } from "../infrastructure/cache/SecretCache.js";

export class DeleteSecret {
  constructor(
    private secretRepository: SecretRepository,
    private appRepository: AppRepository,
    private environmentRepository: EnvironmentRepository,
    private cache: SecretCache
  ) {}

  async execute(id: string): Promise<void> {
    const secret = await this.secretRepository.findById(id);
    if (!secret) {
      throw new Error("Secret not found");
    }

    // CASCADE handles secret_values cleanup
    await this.secretRepository.delete(id);

    // Invalidate cache for all environments of this app
    const app = await this.appRepository.findById(secret.appId);
    if (app) {
      const envs = await this.environmentRepository.findByAppId(app.id.value);
      for (const env of envs) {
        await this.cache.invalidate(app.key, env.key);
      }
    }
  }
}
