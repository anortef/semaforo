import { v4 as uuid } from "uuid";
import {
  createUser,
  createSystemSetting,
  createAppMember,
  createApiKey,
  type UserRepository,
  type SystemSettingRepository,
  type AppMemberRepository,
  type ApiKeyRepository,
  type AppRepository,
  type EnvironmentRepository,
  type UserRole,
  type AppMemberRole,
} from "@semaforo/domain";
import type { ImportApp } from "./ImportApp.js";

export interface FullExport {
  users: Array<{
    email: string;
    name: string;
    passwordHash: string;
    role: string;
    disabled: boolean;
  }>;
  settings: Array<{ key: string; value: string }>;
  apps: Array<{
    app: { name: string; key: string; description?: string };
    environments: Array<{ name: string; key: string; cacheTtlSeconds?: number }>;
    toggles: Array<{
      name: string;
      key: string;
      description?: string;
      values: Record<string, boolean>;
    }>;
    members: Array<{ userEmail: string; role: string }>;
    apiKeys: Array<{ environmentKey: string; key: string; name: string }>;
  }>;
  exportedAt: string;
}

export class ImportAll {
  constructor(
    private importApp: ImportApp,
    private userRepository: UserRepository,
    private settingRepository: SystemSettingRepository,
    private memberRepository: AppMemberRepository,
    private apiKeyRepository: ApiKeyRepository,
    private appRepository: AppRepository,
    private environmentRepository: EnvironmentRepository
  ) {}

  async execute(data: FullExport): Promise<void> {
    // 1. Restore users (with pre-hashed passwords)
    const userIdByEmail = new Map<string, string>();
    for (const u of data.users) {
      const existing = await this.userRepository.findByEmail(u.email);
      if (existing) {
        userIdByEmail.set(u.email, existing.id.value);
        continue;
      }
      const user = createUser({
        id: uuid(),
        email: u.email,
        name: u.name,
        passwordHash: u.passwordHash,
        role: u.role as UserRole,
      });
      await this.userRepository.save(user);
      userIdByEmail.set(u.email, user.id.value);
    }

    // 2. Restore settings
    for (const s of data.settings) {
      const setting = createSystemSetting({ id: uuid(), key: s.key, value: s.value });
      await this.settingRepository.save(setting);
    }

    // 3. Restore apps with toggles and environments
    for (const appData of data.apps) {
      await this.importApp.execute(appData);

      // 4. Restore members
      const app = await this.appRepository.findByKey(appData.app.key);
      if (!app) continue;

      for (const m of appData.members) {
        const userId = userIdByEmail.get(m.userEmail);
        if (!userId) continue;
        const member = createAppMember({
          id: uuid(),
          appId: app.id.value,
          userId,
          role: m.role as AppMemberRole,
        });
        await this.memberRepository.save(member);
      }

      // 5. Restore API keys
      const envs = await this.environmentRepository.findByAppId(app.id.value);
      const envIdByKey = new Map(envs.map((e) => [e.key, e.id.value]));
      for (const ak of appData.apiKeys) {
        const envId = envIdByKey.get(ak.environmentKey);
        if (!envId) continue;
        const apiKey = createApiKey({
          id: uuid(),
          environmentId: envId,
          name: ak.name,
          key: ak.key,
        });
        await this.apiKeyRepository.save(apiKey);
      }
    }
  }
}
