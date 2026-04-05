import { v4 as uuid } from "uuid";
import { createSystemSetting, type SystemSetting, type SystemSettingRepository } from "@semaforo/domain";

export class AdminUpdateSystemSetting {
  constructor(private repository: SystemSettingRepository) {}

  async execute(params: {
    key: string;
    value: string;
  }): Promise<SystemSetting> {
    const existing = await this.repository.findByKey(params.key);
    const setting = createSystemSetting({
      id: existing?.id.value ?? uuid(),
      key: params.key,
      value: params.value,
    });

    await this.repository.save(setting);
    return setting;
  }
}
