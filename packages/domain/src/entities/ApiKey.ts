export interface ApiKeyId {
  readonly value: string;
}

export interface ApiKey {
  readonly id: ApiKeyId;
  readonly appId: string;
  readonly name: string;
  readonly key: string;
  readonly createdAt: Date;
}

export function createApiKey(params: {
  id: string;
  appId: string;
  name: string;
  key: string;
}): ApiKey {
  if (params.name.trim().length === 0) {
    throw new Error("API key name cannot be empty");
  }
  if (params.key.length === 0) {
    throw new Error("API key value cannot be empty");
  }
  return {
    id: { value: params.id },
    appId: params.appId,
    name: params.name.trim(),
    key: params.key,
    createdAt: new Date(),
  };
}
