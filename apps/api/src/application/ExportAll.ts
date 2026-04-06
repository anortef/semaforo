import type {
  AppRepository,
  UserRepository,
  SystemSettingRepository,
  AppMemberRepository,
  ApiKeyRepository,
  EnvironmentRepository,
} from "@semaforo/domain";
import type { ExportApp, AppExportData } from "./ExportApp.js";

export interface UserExport {
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  disabled: boolean;
}

export interface MemberExport {
  userEmail: string;
  role: string;
}

export interface ApiKeyExport {
  environmentKey: string;
  key: string;
  name: string;
}

export interface AppFullExport extends AppExportData {
  members: MemberExport[];
  apiKeys: ApiKeyExport[];
}

export interface AllExportData {
  users: UserExport[];
  settings: Array<{ key: string; value: string }>;
  apps: AppFullExport[];
  exportedAt: string;
}

export class ExportAll {
  constructor(
    private appRepository: AppRepository,
    private exportApp: ExportApp,
    private userRepository: UserRepository,
    private settingRepository: SystemSettingRepository,
    private memberRepository: AppMemberRepository,
    private apiKeyRepository: ApiKeyRepository,
    private environmentRepository?: EnvironmentRepository
  ) {}

  async execute(): Promise<AllExportData> {
    const [allApps, allUsers, allSettings] = await Promise.all([
      this.appRepository.findAll(),
      this.userRepository.findAll({ limit: 10000, offset: 0 }),
      this.settingRepository.findAll(),
    ]);

    // Exclude seed admin — fresh install creates it
    const exportUsers = allUsers.filter((u) => u.email !== "admin@semaforo.local");
    const userEmailById = new Map(allUsers.map((u) => [u.id.value, u.email]));

    const apps = await Promise.all(
      allApps.map(async (app) => {
        const base = await this.exportApp.execute(app.id.value);
        const members = await this.memberRepository.findByAppId(app.id.value);

        const apiKeys: ApiKeyExport[] = [];
        if (this.environmentRepository) {
          const envEntities = await this.environmentRepository.findByAppId(app.id.value);
          for (const envEntity of envEntities) {
            const keys = await this.apiKeyRepository.findByEnvironmentId(envEntity.id.value);
            for (const k of keys) {
              apiKeys.push({ environmentKey: envEntity.key, key: k.key, name: k.name });
            }
          }
        }

        return {
          ...base,
          members: members.map((m) => ({
            userEmail: userEmailById.get(m.userId) ?? "unknown",
            role: m.role,
          })),
          apiKeys,
        };
      })
    );

    return {
      users: exportUsers.map((u) => ({
        email: u.email,
        name: u.name,
        passwordHash: u.passwordHash,
        role: u.role,
        disabled: u.disabled,
      })),
      settings: allSettings.map((s) => ({ key: s.key, value: s.value })),
      apps,
      exportedAt: new Date().toISOString(),
    };
  }
}
