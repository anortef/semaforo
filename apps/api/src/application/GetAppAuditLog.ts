import type {
  AuditLogEntry,
  AuditLogRepository,
  AppRepository,
  EnvironmentRepository,
  FeatureToggleRepository,
} from "@semaforo/domain";

export class GetAppAuditLog {
  constructor(
    private appRepository: AppRepository,
    private environmentRepository: EnvironmentRepository,
    private toggleRepository: FeatureToggleRepository,
    private auditLogRepository: AuditLogRepository
  ) {}

  async execute(params: {
    appId: string;
    limit: number;
    offset: number;
  }): Promise<{ entries: AuditLogEntry[]; total: number }> {
    const app = await this.appRepository.findById(params.appId);
    if (!app) throw new Error("App not found");

    const [envs, toggles] = await Promise.all([
      this.environmentRepository.findByAppId(params.appId),
      this.toggleRepository.findByAppId(params.appId),
    ]);

    const resourceIds = [
      params.appId,
      ...envs.map((e) => e.id.value),
      ...toggles.map((t) => t.id.value),
    ];

    const [entries, total] = await Promise.all([
      this.auditLogRepository.findByResourceIds(resourceIds, params),
      this.auditLogRepository.countByResourceIds(resourceIds),
    ]);

    return { entries, total };
  }
}
