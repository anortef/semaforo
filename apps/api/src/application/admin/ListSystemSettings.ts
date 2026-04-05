import type { SystemSetting, SystemSettingRepository } from "@semaforo/domain";

export class AdminListSystemSettings {
  constructor(private repository: SystemSettingRepository) {}

  async execute(): Promise<SystemSetting[]> {
    return this.repository.findAll();
  }
}
