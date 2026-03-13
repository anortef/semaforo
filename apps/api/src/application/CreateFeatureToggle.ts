import {
  createFeatureToggle,
  type FeatureToggle,
  type AppRepository,
  type FeatureToggleRepository,
} from "@semaforo/domain";
import { v4 as uuid } from "uuid";

export class CreateFeatureToggle {
  constructor(
    private appRepository: AppRepository,
    private toggleRepository: FeatureToggleRepository
  ) {}

  async execute(params: {
    appId: string;
    name: string;
    key: string;
    description?: string;
  }): Promise<FeatureToggle> {
    const app = await this.appRepository.findById(params.appId);
    if (!app) {
      throw new Error("App not found");
    }

    const existing = await this.toggleRepository.findByAppIdAndKey(
      params.appId,
      params.key
    );
    if (existing) {
      throw new Error(
        `Toggle with key "${params.key}" already exists in this app`
      );
    }

    const toggle = createFeatureToggle({
      id: uuid(),
      appId: params.appId,
      name: params.name,
      key: params.key,
      description: params.description,
    });

    await this.toggleRepository.save(toggle);
    return toggle;
  }
}
