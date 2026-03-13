import type {
  AppRepository,
  EnvironmentRepository,
  FeatureToggleRepository,
  ToggleValueRepository,
} from "@semaforo/domain";

export class GetPublicToggles {
  constructor(
    private appRepository: AppRepository,
    private environmentRepository: EnvironmentRepository,
    private toggleRepository: FeatureToggleRepository,
    private toggleValueRepository: ToggleValueRepository
  ) {}

  async execute(params: {
    appKey: string;
    envKey: string;
  }): Promise<Record<string, boolean>> {
    const app = await this.appRepository.findByKey(params.appKey);
    if (!app) {
      throw new Error("App not found");
    }

    const environment = await this.environmentRepository.findByAppIdAndKey(
      app.id.value,
      params.envKey
    );
    if (!environment) {
      throw new Error("Environment not found");
    }

    const toggles = await this.toggleRepository.findByAppId(app.id.value);
    const values = await this.toggleValueRepository.findByEnvironmentId(
      environment.id.value
    );

    const valueMap = new Map(values.map((v) => [v.toggleId, v.enabled]));

    const result: Record<string, boolean> = {};
    for (const toggle of toggles) {
      result[toggle.key] = valueMap.get(toggle.id.value) ?? false;
    }

    return result;
  }
}
