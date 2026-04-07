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

export interface ImportResult {
  success: boolean;
  warnings: string[];
}

export interface ValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    users: number;
    settings: number;
    apps: number;
    environments: number;
    toggles: number;
    secrets: number;
    apiKeys: number;
  };
  conflicts: {
    existingUsers: string[];
    existingApps: string[];
  };
  exportedAt: string | null;
}

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
    secrets?: Array<{
      key: string;
      description?: string;
      values: Record<string, string>;
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

  async execute(data: FullExport): Promise<ImportResult> {
    const warnings: string[] = [];
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

    // 3. Restore apps with toggles, environments, and secrets
    let hasSecrets = false;
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

      // Check if import contains secrets
      if (appData.secrets && appData.secrets.length > 0) {
        hasSecrets = true;
      }
    }

    if (hasSecrets) {
      warnings.push(
        "This import contains encrypted secrets. To decrypt them, you must set the same ENCRYPTION_KEY in your .env file that was used when the secrets were originally created.",
        "Update your .env file: ENCRYPTION_KEY=<original_key>",
        "Then restart the environment: docker compose down && ./start.sh"
      );
    }

    // JWT_SECRET warning: imported users have password hashes tied to the original instance
    warnings.push(
      "Imported users retain their original password hashes. Ensure JWT_SECRET in your .env file is set appropriately.",
      "If this is a new instance, update .env with the original JWT_SECRET value and restart: docker compose down && ./start.sh"
    );

    return { success: true, warnings };
  }

  async validate(data: unknown): Promise<ValidationReport> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const conflicts = { existingUsers: [] as string[], existingApps: [] as string[] };
    const summary = { users: 0, settings: 0, apps: 0, environments: 0, toggles: 0, secrets: 0, apiKeys: 0 };

    // Structure validation
    if (!data || typeof data !== "object") {
      return { valid: false, errors: ["Backup data is not a valid object"], warnings, summary, conflicts, exportedAt: null };
    }

    const d = data as Record<string, unknown>;

    if (!Array.isArray(d.apps)) {
      errors.push("Missing or invalid 'apps' array");
    }
    if (!Array.isArray(d.users)) {
      errors.push("Missing or invalid 'users' array");
    }
    if (!Array.isArray(d.settings)) {
      errors.push("Missing or invalid 'settings' array");
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings, summary, conflicts, exportedAt: (d.exportedAt as string) ?? null };
    }

    const typed = data as FullExport;
    summary.users = typed.users.length;
    summary.settings = typed.settings.length;
    summary.apps = typed.apps.length;

    for (const appData of typed.apps) {
      if (!appData.app?.key) {
        errors.push(`App entry missing 'app.key'`);
        continue;
      }
      summary.environments += appData.environments?.length ?? 0;
      summary.toggles += appData.toggles?.length ?? 0;
      summary.secrets += appData.secrets?.length ?? 0;
      summary.apiKeys += appData.apiKeys?.length ?? 0;
    }

    // Check conflicts against existing data
    for (const u of typed.users) {
      if (!u.email) {
        errors.push("User entry missing 'email'");
        continue;
      }
      const existing = await this.userRepository.findByEmail(u.email);
      if (existing) {
        conflicts.existingUsers.push(u.email);
      }
    }

    for (const appData of typed.apps) {
      if (!appData.app?.key) continue;
      const existing = await this.appRepository.findByKey(appData.app.key);
      if (existing) {
        conflicts.existingApps.push(appData.app.key);
      }
    }

    // Warnings
    if (conflicts.existingUsers.length > 0) {
      warnings.push(`${conflicts.existingUsers.length} user(s) already exist and will be skipped`);
    }
    if (conflicts.existingApps.length > 0) {
      errors.push(`${conflicts.existingApps.length} app(s) already exist and will fail to import: ${conflicts.existingApps.join(", ")}`);
    }

    const hasSecrets = typed.apps.some((a) => a.secrets && a.secrets.length > 0);
    if (hasSecrets) {
      warnings.push("Backup contains encrypted secrets — requires matching ENCRYPTION_KEY to decrypt");
    }
    if (typed.users.length > 0) {
      warnings.push("Imported users retain original password hashes — ensure JWT_SECRET matches the original instance");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary,
      conflicts,
      exportedAt: typed.exportedAt ?? null,
    };
  }
}
