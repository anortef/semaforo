export interface EnvironmentId {
  readonly value: string;
}

export interface Environment {
  readonly id: EnvironmentId;
  readonly appId: string;
  readonly name: string;
  readonly key: string;
  readonly cacheTtlSeconds: number;
  readonly createdAt: Date;
}

const ENV_KEY_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const DEFAULT_CACHE_TTL_SECONDS = 300; // 5 minutes

export function createEnvironment(params: {
  id: string;
  appId: string;
  name: string;
  key: string;
  cacheTtlSeconds?: number;
}): Environment {
  if (params.name.trim().length === 0) {
    throw new Error("Environment name cannot be empty");
  }
  if (!ENV_KEY_REGEX.test(params.key)) {
    throw new Error(
      "Environment key must be lowercase alphanumeric with hyphens"
    );
  }
  const ttl = params.cacheTtlSeconds ?? DEFAULT_CACHE_TTL_SECONDS;
  if (ttl < 0 || ttl > 86400) {
    throw new Error("Cache TTL must be between 0 and 86400 seconds");
  }
  return {
    id: { value: params.id },
    appId: params.appId,
    name: params.name.trim(),
    key: params.key,
    cacheTtlSeconds: ttl,
    createdAt: new Date(),
  };
}

export function updateEnvironment(
  env: Environment,
  updates: { name?: string; cacheTtlSeconds?: number }
): Environment {
  if (updates.name !== undefined && updates.name.trim().length === 0) {
    throw new Error("Environment name cannot be empty");
  }
  if (updates.cacheTtlSeconds !== undefined) {
    if (updates.cacheTtlSeconds < 0 || updates.cacheTtlSeconds > 86400) {
      throw new Error("Cache TTL must be between 0 and 86400 seconds");
    }
  }
  return {
    ...env,
    name: updates.name !== undefined ? updates.name.trim() : env.name,
    cacheTtlSeconds: updates.cacheTtlSeconds ?? env.cacheTtlSeconds,
  };
}
