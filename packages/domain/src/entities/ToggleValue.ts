export interface ToggleValueId {
  readonly value: string;
}

export interface ToggleValue {
  readonly id: ToggleValueId;
  readonly toggleId: string;
  readonly environmentId: string;
  readonly enabled: boolean;
  readonly stringValue: string;
  readonly rolloutPercentage: number;
  readonly updatedAt: Date;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createToggleValue(params: {
  id: string;
  toggleId: string;
  environmentId: string;
  enabled?: boolean;
  stringValue?: string;
  rolloutPercentage?: number;
}): ToggleValue {
  return {
    id: { value: params.id },
    toggleId: params.toggleId,
    environmentId: params.environmentId,
    enabled: params.enabled ?? false,
    stringValue: params.stringValue ?? "",
    rolloutPercentage: clamp(params.rolloutPercentage ?? 100, 0, 100),
    updatedAt: new Date(),
  };
}

export function updateToggleValue(
  toggleValue: ToggleValue,
  changes: { enabled?: boolean; stringValue?: string; rolloutPercentage?: number }
): ToggleValue {
  return {
    ...toggleValue,
    enabled: changes.enabled ?? toggleValue.enabled,
    stringValue: changes.stringValue ?? toggleValue.stringValue,
    rolloutPercentage: changes.rolloutPercentage !== undefined
      ? clamp(changes.rolloutPercentage, 0, 100)
      : toggleValue.rolloutPercentage,
    updatedAt: new Date(),
  };
}
