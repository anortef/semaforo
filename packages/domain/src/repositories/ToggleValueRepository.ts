import type { ToggleValue } from "../entities/ToggleValue.js";

export interface ToggleValueRepository {
  findByToggleAndEnvironment(
    toggleId: string,
    environmentId: string
  ): Promise<ToggleValue | null>;
  findByEnvironmentId(environmentId: string): Promise<ToggleValue[]>;
  save(value: ToggleValue): Promise<void>;
  delete(id: string): Promise<void>;
}
