import type {
  AuditLogEntry,
  AuditLogRepository,
  AppRepository,
  EnvironmentRepository,
  FeatureToggleRepository,
  SecretRepository,
} from "@semaforo/domain";

export interface EnrichedAuditEntry {
  id: { value: string };
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  details: string;
  createdAt: Date;
}

export class GetAppAuditLog {
  constructor(
    private appRepository: AppRepository,
    private environmentRepository: EnvironmentRepository,
    private toggleRepository: FeatureToggleRepository,
    private auditLogRepository: AuditLogRepository,
    private secretRepository?: SecretRepository
  ) {}

  async execute(params: {
    appId: string;
    limit: number;
    offset: number;
  }): Promise<{ entries: EnrichedAuditEntry[]; total: number }> {
    const app = await this.appRepository.findById(params.appId);
    if (!app) throw new Error("App not found");

    const [envs, toggles] = await Promise.all([
      this.environmentRepository.findByAppId(params.appId),
      this.toggleRepository.findByAppId(params.appId),
    ]);
    const secrets = this.secretRepository
      ? await this.secretRepository.findByAppId(params.appId)
      : [];

    const resourceIds = [
      params.appId,
      ...envs.map((e) => e.id.value),
      ...toggles.map((t) => t.id.value),
      ...secrets.map((s) => s.id.value),
    ];

    // Build name lookup
    const nameMap = new Map<string, string>();
    nameMap.set(params.appId, app.name);
    for (const e of envs) nameMap.set(e.id.value, e.name);
    for (const t of toggles) nameMap.set(t.id.value, t.name);
    for (const s of secrets) nameMap.set(s.id.value, s.key);

    const [entries, total] = await Promise.all([
      this.auditLogRepository.findByResourceIds(resourceIds, params),
      this.auditLogRepository.countByResourceIds(resourceIds),
    ]);

    const enriched = entries.map((e) => ({
      id: e.id,
      userId: e.userId,
      action: e.action,
      resourceType: e.resourceType,
      resourceId: e.resourceId,
      resourceName: nameMap.get(e.resourceId) ?? e.resourceId,
      details: e.details,
      createdAt: e.createdAt,
    }));

    return { entries: enriched, total };
  }
}
