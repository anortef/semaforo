import type { FeatureToggle } from "../entities/FeatureToggle.js";

export interface FeatureToggleRepository {
  findById(id: string): Promise<FeatureToggle | null>;
  findByAppId(appId: string): Promise<FeatureToggle[]>;
  findByAppIdAndKey(appId: string, key: string): Promise<FeatureToggle | null>;
  save(toggle: FeatureToggle): Promise<void>;
  delete(id: string): Promise<void>;
}
