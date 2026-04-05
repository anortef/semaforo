import type { AuditLogEntry, AuditLogRepository } from "@semaforo/domain";

export class AdminListAuditLog {
  constructor(private repository: AuditLogRepository) {}

  async execute(params: {
    limit: number;
    offset: number;
  }): Promise<{ entries: AuditLogEntry[]; total: number }> {
    const [entries, total] = await Promise.all([
      this.repository.findAll(params),
      this.repository.countAll(),
    ]);
    return { entries, total };
  }
}
