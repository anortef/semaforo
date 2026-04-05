export interface SystemSettingId {
  readonly value: string;
}

export interface SystemSetting {
  readonly id: SystemSettingId;
  readonly key: string;
  readonly value: string;
  readonly updatedAt: Date;
}

export function createSystemSetting(params: {
  id: string;
  key: string;
  value: string;
}): SystemSetting {
  if (params.key.trim().length === 0) {
    throw new Error("Setting key cannot be empty");
  }
  if (params.value.length === 0) {
    throw new Error("Setting value cannot be empty");
  }
  return {
    id: { value: params.id },
    key: params.key.trim(),
    value: params.value,
    updatedAt: new Date(),
  };
}
