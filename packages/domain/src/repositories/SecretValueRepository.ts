import type { SecretValue } from "../entities/SecretValue.js";

export interface SecretValueRepository {
  findBySecretAndEnvironment(
    secretId: string,
    environmentId: string
  ): Promise<SecretValue | null>;
  findByEnvironmentId(environmentId: string): Promise<SecretValue[]>;
  findBySecretId(secretId: string): Promise<SecretValue[]>;
  save(value: SecretValue): Promise<void>;
  delete(id: string): Promise<void>;
}
