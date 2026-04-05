import type { SystemSetting } from "../entities/SystemSetting.js";

export interface SystemSettingRepository {
  findByKey(key: string): Promise<SystemSetting | null>;
  findAll(): Promise<SystemSetting[]>;
  save(setting: SystemSetting): Promise<void>;
}
