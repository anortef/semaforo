import { v4 as uuid } from "uuid";
import { createAuditLogEntry, type AuditLogRepository } from "@semaforo/domain";

export class RecordAuditEvent {
  constructor(private repository: AuditLogRepository) {}

  async execute(params: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    details?: string;
  }): Promise<void> {
    const entry = createAuditLogEntry({
      id: uuid(),
      ...params,
    });
    await this.repository.save(entry);
  }
}
