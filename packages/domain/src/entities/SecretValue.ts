export interface SecretValueId {
  readonly value: string;
}

export interface SecretValue {
  readonly id: SecretValueId;
  readonly secretId: string;
  readonly environmentId: string;
  readonly encryptedValue: string;
  readonly updatedAt: Date;
}

export function createSecretValue(params: {
  id: string;
  secretId: string;
  environmentId: string;
  encryptedValue?: string;
}): SecretValue {
  return {
    id: { value: params.id },
    secretId: params.secretId,
    environmentId: params.environmentId,
    encryptedValue: params.encryptedValue ?? "",
    updatedAt: new Date(),
  };
}

export function updateSecretValue(
  secretValue: SecretValue,
  changes: { encryptedValue: string }
): SecretValue {
  return {
    ...secretValue,
    encryptedValue: changes.encryptedValue,
    updatedAt: new Date(),
  };
}
