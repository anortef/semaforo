import type pg from "pg";
import type { AuditLogEntry, AuditLogRepository } from "@semaforo/domain";

export class PgAuditLogRepository implements AuditLogRepository {
  constructor(private pool: pg.Pool) {}

  async save(entry: AuditLogEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [entry.id.value, entry.userId, entry.action, entry.resourceType, entry.resourceId, entry.details, entry.createdAt]
    );
  }

  async findAll(params: { limit: number; offset: number }): Promise<AuditLogEntry[]> {
    const result = await this.pool.query(
      "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [params.limit, params.offset]
    );
    return result.rows.map(toDomain);
  }

  async countAll(): Promise<number> {
    const result = await this.pool.query("SELECT COUNT(*)::int AS count FROM audit_log");
    return result.rows[0].count;
  }

  async findByUserId(userId: string, params: { limit: number; offset: number }): Promise<AuditLogEntry[]> {
    const result = await this.pool.query(
      "SELECT * FROM audit_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [userId, params.limit, params.offset]
    );
    return result.rows.map(toDomain);
  }

  async findByResourceIds(ids: string[], params: { limit: number; offset: number }): Promise<AuditLogEntry[]> {
    if (ids.length === 0) return [];
    const result = await this.pool.query(
      "SELECT * FROM audit_log WHERE resource_id = ANY($1) ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [ids, params.limit, params.offset]
    );
    return result.rows.map(toDomain);
  }

  async countByResourceIds(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await this.pool.query(
      "SELECT COUNT(*)::int AS count FROM audit_log WHERE resource_id = ANY($1)",
      [ids]
    );
    return result.rows[0].count;
  }
}

function toDomain(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: { value: row.id as string },
    userId: row.user_id as string,
    action: row.action as string,
    resourceType: row.resource_type as string,
    resourceId: row.resource_id as string,
    details: row.details as string,
    createdAt: new Date(row.created_at as string),
  };
}
