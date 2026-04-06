import { v4 as uuid } from "uuid";
import {
  createApp,
  createEnvironment,
  createFeatureToggle,
  createToggleValue,
  type AppRepository,
  type EnvironmentRepository,
  type FeatureToggleRepository,
  type ToggleValueRepository,
} from "@semaforo/domain";

export interface AppExport {
  app: { name: string; key: string; description?: string };
  environments: Array<{ name: string; key: string; cacheTtlSeconds?: number }>;
  toggles: Array<{
    name: string;
    key: string;
    description?: string;
    type?: string;
    values: Record<string, boolean | string>;
  }>;
}

export class ImportApp {
  constructor(
    private appRepository: AppRepository,
    private environmentRepository: EnvironmentRepository,
    private toggleRepository: FeatureToggleRepository,
    private toggleValueRepository: ToggleValueRepository
  ) {}

  async execute(data: AppExport): Promise<void> {
    const existing = await this.appRepository.findByKey(data.app.key);
    if (existing) {
      throw new Error(`App with key "${data.app.key}" already exists`);
    }

    const app = createApp({
      id: uuid(),
      name: data.app.name,
      key: data.app.key,
      description: data.app.description,
    });
    await this.appRepository.save(app);

    const envIdByKey = new Map<string, string>();
    for (const envData of data.environments) {
      const env = createEnvironment({
        id: uuid(),
        appId: app.id.value,
        name: envData.name,
        key: envData.key,
      });
      await this.environmentRepository.save(env);
      envIdByKey.set(envData.key, env.id.value);
    }

    for (const toggleData of data.toggles) {
      const toggle = createFeatureToggle({
        id: uuid(),
        appId: app.id.value,
        name: toggleData.name,
        key: toggleData.key,
        description: toggleData.description,
        type: toggleData.type as "boolean" | "string" | undefined,
      });
      await this.toggleRepository.save(toggle);

      for (const [envKey, value] of Object.entries(toggleData.values)) {
        const envId = envIdByKey.get(envKey);
        if (!envId) continue;
        const tv = createToggleValue({
          id: uuid(),
          toggleId: toggle.id.value,
          environmentId: envId,
          enabled: typeof value === "boolean" ? value : false,
          stringValue: typeof value === "string" ? value : undefined,
        });
        await this.toggleValueRepository.save(tv);
      }
    }
  }
}
