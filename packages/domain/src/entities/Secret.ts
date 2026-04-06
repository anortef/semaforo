export interface SecretId {
  readonly value: string;
}

export interface Secret {
  readonly id: SecretId;
  readonly appId: string;
  readonly key: string;
  readonly description: string;
  readonly createdAt: Date;
}

const SECRET_KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9]*$/;

export function createSecret(params: {
  id: string;
  appId: string;
  key: string;
  description?: string;
}): Secret {
  if (!SECRET_KEY_REGEX.test(params.key)) {
    throw new Error(
      "Secret key must be camelCase alphanumeric (e.g. databasePassword)"
    );
  }
  return {
    id: { value: params.id },
    appId: params.appId,
    key: params.key,
    description: params.description ?? "",
    createdAt: new Date(),
  };
}
