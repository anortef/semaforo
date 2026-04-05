import type pg from "pg";
import type { AppMember, AppMemberRepository, AppMemberRole } from "@semaforo/domain";

export class PgAppMemberRepository implements AppMemberRepository {
  constructor(private pool: pg.Pool) {}

  async findById(id: string): Promise<AppMember | null> {
    const result = await this.pool.query(
      "SELECT * FROM app_members WHERE id = $1",
      [id]
    );
    return result.rows[0] ? toDomain(result.rows[0]) : null;
  }

  async findByAppId(appId: string): Promise<AppMember[]> {
    const result = await this.pool.query(
      "SELECT * FROM app_members WHERE app_id = $1 ORDER BY created_at",
      [appId]
    );
    return result.rows.map(toDomain);
  }

  async findByUserId(userId: string): Promise<AppMember[]> {
    const result = await this.pool.query(
      "SELECT * FROM app_members WHERE user_id = $1",
      [userId]
    );
    return result.rows.map(toDomain);
  }

  async findByAppIdAndUserId(appId: string, userId: string): Promise<AppMember | null> {
    const result = await this.pool.query(
      "SELECT * FROM app_members WHERE app_id = $1 AND user_id = $2",
      [appId, userId]
    );
    return result.rows[0] ? toDomain(result.rows[0]) : null;
  }

  async save(member: AppMember): Promise<void> {
    await this.pool.query(
      `INSERT INTO app_members (id, app_id, user_id, role, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (app_id, user_id) DO UPDATE SET role = $4`,
      [member.id.value, member.appId, member.userId, member.role, member.createdAt]
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM app_members WHERE id = $1", [id]);
  }
}

function toDomain(row: Record<string, unknown>): AppMember {
  return {
    id: { value: row.id as string },
    appId: row.app_id as string,
    userId: row.user_id as string,
    role: row.role as AppMemberRole,
    createdAt: new Date(row.created_at as string),
  };
}
