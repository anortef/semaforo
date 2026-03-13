export interface EnvironmentId {
  readonly value: string;
}

export interface Environment {
  readonly id: EnvironmentId;
  readonly appId: string;
  readonly name: string;
  readonly key: string;
  readonly createdAt: Date;
}

const ENV_KEY_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

export function createEnvironment(params: {
  id: string;
  appId: string;
  name: string;
  key: string;
}): Environment {
  if (params.name.trim().length === 0) {
    throw new Error("Environment name cannot be empty");
  }
  if (!ENV_KEY_REGEX.test(params.key)) {
    throw new Error(
      "Environment key must be lowercase alphanumeric with hyphens"
    );
  }
  return {
    id: { value: params.id },
    appId: params.appId,
    name: params.name.trim(),
    key: params.key,
    createdAt: new Date(),
  };
}
