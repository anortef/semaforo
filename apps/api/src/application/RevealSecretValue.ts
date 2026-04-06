import type { SecretValueRepository } from "@semaforo/domain";
import type { EncryptionService } from "../infrastructure/crypto/EncryptionService.js";

export interface RevealedSecretValue {
  secretId: string;
  environmentId: string;
  value: string;
}

export class RevealSecretValue {
  constructor(
    private secretValueRepository: SecretValueRepository,
    private encryptionService: EncryptionService
  ) {}

  async execute(params: {
    secretId: string;
    environmentId: string;
  }): Promise<RevealedSecretValue> {
    const secretValue =
      await this.secretValueRepository.findBySecretAndEnvironment(
        params.secretId,
        params.environmentId
      );
    if (!secretValue || !secretValue.encryptedValue) {
      throw new Error("Secret value not found");
    }

    const value = this.encryptionService.decrypt(secretValue.encryptedValue);
    return {
      secretId: secretValue.secretId,
      environmentId: secretValue.environmentId,
      value,
    };
  }
}
