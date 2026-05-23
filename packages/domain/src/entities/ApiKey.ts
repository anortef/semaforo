export interface ApiKeyId {
  readonly value: string;
}

export interface ApiKey {
  readonly id: ApiKeyId;
  readonly environmentId: string;
  readonly name: string;
  // SHA-256 hex digest of the high-entropy random API key. The plaintext
  // is never persisted; only the hash is stored at rest. See
  // hashApiKey in the api workspace for the canonical hashing function.
  readonly keyHash: string;
  readonly createdAt: Date;
}

export function createApiKey(params: {
  id: string;
  environmentId: string;
  name: string;
  keyHash: string;
}): ApiKey {
  if (params.name.trim().length === 0) {
    throw new Error("API key name cannot be empty");
  }
  if (params.keyHash.length === 0) {
    throw new Error("API key hash cannot be empty");
  }
  return {
    id: { value: params.id },
    environmentId: params.environmentId,
    name: params.name.trim(),
    keyHash: params.keyHash,
    createdAt: new Date(),
  };
}
