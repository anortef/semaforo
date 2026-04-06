import type { SecretValueRepository } from "@semaforo/domain";
import type { EncryptionService } from "../infrastructure/crypto/EncryptionService.js";

export interface MaskedSecretValue {
  secretId: string;
  environmentId: string;
  maskedValue: string;
  updatedAt: Date;
}

function maskValue(value: string): string {
  if (value.length <= 4) return "****";
  return "****" + value.slice(-4);
}

export class GetSecretValue {
  constructor(
    private secretValueRepository: SecretValueRepository,
    private encryptionService: EncryptionService
  ) {}

  async execute(params: {
    secretId: string;
    environmentId: string;
  }): Promise<MaskedSecretValue | null> {
    const value = await this.secretValueRepository.findBySecretAndEnvironment(
      params.secretId,
      params.environmentId
    );
    if (!value || !value.encryptedValue) return null;

    const decrypted = this.encryptionService.decrypt(value.encryptedValue);
    return {
      secretId: value.secretId,
      environmentId: value.environmentId,
      maskedValue: maskValue(decrypted),
      updatedAt: value.updatedAt,
    };
  }
}
