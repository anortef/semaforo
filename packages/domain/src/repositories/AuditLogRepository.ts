import type { AuditLogEntry } from "../entities/AuditLogEntry.js";

export interface AuditLogRepository {
  save(entry: AuditLogEntry): Promise<void>;
  findAll(params: { limit: number; offset: number }): Promise<AuditLogEntry[]>;
  countAll(): Promise<number>;
  findByUserId(userId: string, params: { limit: number; offset: number }): Promise<AuditLogEntry[]>;
  findByResourceIds(ids: string[], params: { limit: number; offset: number }): Promise<AuditLogEntry[]>;
  countByResourceIds(ids: string[]): Promise<number>;
}
