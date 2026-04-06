import type { User, UserRepository, SystemSetting, SystemSettingRepository, AuditLogEntry, AuditLogRepository } from "@semaforo/domain";

export class InMemoryUserRepository implements UserRepository {
  users: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id.value === id) ?? null;
  }
  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }
  async findAll(params: { limit: number; offset: number }): Promise<User[]> {
    return this.users.slice(params.offset, params.offset + params.limit);
  }
  async save(user: User): Promise<void> {
    const idx = this.users.findIndex((u) => u.id.value === user.id.value);
    if (idx >= 0) this.users[idx] = user;
    else this.users.push(user);
  }
  async delete(id: string): Promise<void> {
    this.users = this.users.filter((u) => u.id.value !== id);
  }
  async countAll(): Promise<number> {
    return this.users.length;
  }
}

export class InMemorySystemSettingRepository implements SystemSettingRepository {
  settings: SystemSetting[] = [];

  async findByKey(key: string): Promise<SystemSetting | null> {
    return this.settings.find((s) => s.key === key) ?? null;
  }
  async findAll(): Promise<SystemSetting[]> {
    return [...this.settings];
  }
  async save(setting: SystemSetting): Promise<void> {
    const idx = this.settings.findIndex((s) => s.key === setting.key);
    if (idx >= 0) this.settings[idx] = setting;
    else this.settings.push(setting);
  }
}

export class InMemoryAuditLogRepository implements AuditLogRepository {
  entries: AuditLogEntry[] = [];

  async save(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
  }
  async findAll(params: { limit: number; offset: number }): Promise<AuditLogEntry[]> {
    return this.entries
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(params.offset, params.offset + params.limit);
  }
  async countAll(): Promise<number> {
    return this.entries.length;
  }
  async findByUserId(userId: string, params: { limit: number; offset: number }): Promise<AuditLogEntry[]> {
    return this.entries
      .filter((e) => e.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(params.offset, params.offset + params.limit);
  }
  async findByResourceIds(ids: string[], params: { limit: number; offset: number }): Promise<AuditLogEntry[]> {
    return this.entries
      .filter((e) => ids.includes(e.resourceId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(params.offset, params.offset + params.limit);
  }
  async countByResourceIds(ids: string[]): Promise<number> {
    return this.entries.filter((e) => ids.includes(e.resourceId)).length;
  }
}
