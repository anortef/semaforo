export interface ToggleValueId {
  readonly value: string;
}

export interface ToggleValue {
  readonly id: ToggleValueId;
  readonly toggleId: string;
  readonly environmentId: string;
  readonly enabled: boolean;
  readonly stringValue: string;
  readonly updatedAt: Date;
}

export function createToggleValue(params: {
  id: string;
  toggleId: string;
  environmentId: string;
  enabled?: boolean;
  stringValue?: string;
}): ToggleValue {
  return {
    id: { value: params.id },
    toggleId: params.toggleId,
    environmentId: params.environmentId,
    enabled: params.enabled ?? false,
    stringValue: params.stringValue ?? "",
    updatedAt: new Date(),
  };
}

export function updateToggleValue(
  toggleValue: ToggleValue,
  changes: { enabled?: boolean; stringValue?: string }
): ToggleValue {
  return {
    ...toggleValue,
    enabled: changes.enabled ?? toggleValue.enabled,
    stringValue: changes.stringValue ?? toggleValue.stringValue,
    updatedAt: new Date(),
  };
}
