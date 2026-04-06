import type {
  AppRepository,
  EnvironmentRepository,
  FeatureToggleRepository,
  ToggleValueRepository,
} from "@semaforo/domain";

export interface AppExportData {
  app: { name: string; key: string; description: string };
  environments: Array<{ name: string; key: string; cacheTtlSeconds: number }>;
  toggles: Array<{
    name: string;
    key: string;
    description: string;
    type: string;
    values: Record<string, boolean | string>;
    rollout?: Record<string, number>;
  }>;
  exportedAt: string;
}

export class ExportApp {
  constructor(
    private appRepository: AppRepository,
    private environmentRepository: EnvironmentRepository,
    private toggleRepository: FeatureToggleRepository,
    private toggleValueRepository: ToggleValueRepository
  ) {}

  async execute(appId: string): Promise<AppExportData> {
    const app = await this.appRepository.findById(appId);
    if (!app) throw new Error("App not found");

    const envs = await this.environmentRepository.findByAppId(appId);
    const toggles = await this.toggleRepository.findByAppId(appId);

    const envKeyById = new Map(envs.map((e) => [e.id.value, e.key]));

    const toggleExports = await Promise.all(
      toggles.map(async (toggle) => {
        const values: Record<string, boolean | string> = {};
        const rollout: Record<string, number> = {};
        for (const env of envs) {
          const tv = await this.toggleValueRepository.findByToggleAndEnvironment(
            toggle.id.value,
            env.id.value
          );
          values[env.key] = toggle.type === "string"
            ? (tv?.stringValue ?? "")
            : (tv?.enabled ?? false);
          if (tv && tv.rolloutPercentage < 100) {
            rollout[env.key] = tv.rolloutPercentage;
          }
        }
        return {
          name: toggle.name,
          key: toggle.key,
          description: toggle.description,
          type: toggle.type,
          rollout: Object.keys(rollout).length > 0 ? rollout : undefined,
          values,
        };
      })
    );

    return {
      app: { name: app.name, key: app.key, description: app.description },
      environments: envs.map((e) => ({
        name: e.name,
        key: e.key,
        cacheTtlSeconds: e.cacheTtlSeconds,
      })),
      toggles: toggleExports,
      exportedAt: new Date().toISOString(),
    };
  }
}
