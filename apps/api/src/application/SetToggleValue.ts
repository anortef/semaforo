import {
  createToggleValue,
  updateToggleValue,
  type ToggleValue,
  type FeatureToggleRepository,
  type EnvironmentRepository,
  type ToggleValueRepository,
} from "@semaforo/domain";
import { v4 as uuid } from "uuid";

export class SetToggleValue {
  constructor(
    private toggleRepository: FeatureToggleRepository,
    private environmentRepository: EnvironmentRepository,
    private toggleValueRepository: ToggleValueRepository
  ) {}

  async execute(params: {
    toggleId: string;
    environmentId: string;
    enabled: boolean;
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

    if (existing) {
      const updated = updateToggleValue(existing, params.enabled);
      await this.toggleValueRepository.save(updated);
      return updated;
    }

    const value = createToggleValue({
      id: uuid(),
      toggleId: params.toggleId,
      environmentId: params.environmentId,
      enabled: params.enabled,
    });

    await this.toggleValueRepository.save(value);
    return value;
  }
}
