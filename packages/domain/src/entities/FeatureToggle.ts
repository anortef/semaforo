export interface FeatureToggleId {
  readonly value: string;
}

export interface FeatureToggle {
  readonly id: FeatureToggleId;
  readonly appId: string;
  readonly name: string;
  readonly key: string;
  readonly description: string;
  readonly createdAt: Date;
}

const TOGGLE_KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9]*$/;

export function createFeatureToggle(params: {
  id: string;
  appId: string;
  name: string;
  key: string;
  description?: string;
}): FeatureToggle {
  if (params.name.trim().length === 0) {
    throw new Error("Toggle name cannot be empty");
  }
  if (!TOGGLE_KEY_REGEX.test(params.key)) {
    throw new Error(
      "Toggle key must be camelCase alphanumeric (e.g. newCheckout)"
    );
  }
  return {
    id: { value: params.id },
    appId: params.appId,
    name: params.name.trim(),
    key: params.key,
    description: params.description ?? "",
    createdAt: new Date(),
  };
}
