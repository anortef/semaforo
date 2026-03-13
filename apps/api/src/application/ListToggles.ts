import type { FeatureToggle, FeatureToggleRepository } from "@semaforo/domain";

export class ListToggles {
  constructor(private toggleRepository: FeatureToggleRepository) {}

  async execute(appId: string): Promise<FeatureToggle[]> {
    return this.toggleRepository.findByAppId(appId);
  }
}
