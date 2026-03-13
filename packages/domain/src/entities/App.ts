export interface AppId {
  readonly value: string;
}

export interface App {
  readonly id: AppId;
  readonly name: string;
  readonly key: string;
  readonly description: string;
  readonly createdAt: Date;
}

const APP_KEY_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

export function createApp(params: {
  id: string;
  name: string;
  key: string;
  description?: string;
}): App {
  if (params.name.trim().length === 0) {
    throw new Error("App name cannot be empty");
  }
  if (!APP_KEY_REGEX.test(params.key)) {
    throw new Error(
      "App key must be lowercase alphanumeric with hyphens, and cannot start or end with a hyphen"
    );
  }
  return {
    id: { value: params.id },
    name: params.name.trim(),
    key: params.key,
    description: params.description ?? "",
    createdAt: new Date(),
  };
}
