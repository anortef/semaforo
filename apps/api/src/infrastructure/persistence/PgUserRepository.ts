import type pg from "pg";
import type { User, UserRepository, UserRole } from "@semaforo/domain";

export class PgUserRepository implements UserRepository {
  constructor(private pool: pg.Pool) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] ? toDomain(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    return result.rows[0] ? toDomain(result.rows[0]) : null;
  }

  async save(user: User): Promise<void> {
    await this.pool.query(
      `INSERT INTO users (id, email, name, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET email = $2, name = $3, password_hash = $4, role = $5`,
      [user.id.value, user.email, user.name, user.passwordHash, user.role, user.createdAt]
    );
  }

  async countAll(): Promise<number> {
    const result = await this.pool.query("SELECT COUNT(*)::int AS count FROM users");
    return result.rows[0].count;
  }
}

function toDomain(row: Record<string, unknown>): User {
  return {
    id: { value: row.id as string },
    email: row.email as string,
    name: row.name as string,
    passwordHash: row.password_hash as string,
    role: (row.role as UserRole) ?? "user",
    createdAt: new Date(row.created_at as string),
  };
}
