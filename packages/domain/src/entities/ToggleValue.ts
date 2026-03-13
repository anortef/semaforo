export interface ToggleValueId {
  readonly value: string;
}

export interface ToggleValue {
  readonly id: ToggleValueId;
  readonly toggleId: string;
  readonly environmentId: string;
  readonly enabled: boolean;
  readonly updatedAt: Date;
}

export function createToggleValue(params: {
  id: string;
  toggleId: string;
  environmentId: string;
  enabled?: boolean;
}): ToggleValue {
  return {
    id: { value: params.id },
    toggleId: params.toggleId,
    environmentId: params.environmentId,
    enabled: params.enabled ?? false,
    updatedAt: new Date(),
  };
}

export function updateToggleValue(
  toggleValue: ToggleValue,
  enabled: boolean
): ToggleValue {
  return {
    ...toggleValue,
    enabled,
    updatedAt: new Date(),
  };
}
