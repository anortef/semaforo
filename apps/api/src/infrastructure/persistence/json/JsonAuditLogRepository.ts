import fs from "node:fs";
import path from "node:path";
import type { AuditLogEntry, AuditLogRepository } from "@semaforo/domain";

export class JsonAuditLogRepository implements AuditLogRepository {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async save(entry: AuditLogEntry): Promise<void> {
    this.writeQueue = this.writeQueue.then(() => {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(this.filePath, JSON.stringify(entry) + "\n", "utf-8");
    });
    return this.writeQueue;
  }

  async findAll(params: { limit: number; offset: number }): Promise<AuditLogEntry[]> {
    const entries = this.readAll();
    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return entries.slice(params.offset, params.offset + params.limit);
  }

  async countAll(): Promise<number> {
    return this.readAll().length;
  }

  async findByUserId(userId: string, params: { limit: number; offset: number }): Promise<AuditLogEntry[]> {
    const entries = this.readAll().filter((e) => e.userId === userId);
    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return entries.slice(params.offset, params.offset + params.limit);
  }

  async findByResourceIds(ids: string[], params: { limit: number; offset: number }): Promise<AuditLogEntry[]> {
    const idSet = new Set(ids);
    const entries = this.readAll().filter((e) => idSet.has(e.resourceId));
    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return entries.slice(params.offset, params.offset + params.limit);
  }

  async countByResourceIds(ids: string[]): Promise<number> {
    const idSet = new Set(ids);
    return this.readAll().filter((e) => idSet.has(e.resourceId)).length;
  }

  async clear(): Promise<void> {
    if (fs.existsSync(this.filePath)) fs.writeFileSync(this.filePath, "", "utf-8");
  }

  private readAll(): AuditLogEntry[] {
    if (!fs.existsSync(this.filePath)) return [];
    const content = fs.readFileSync(this.filePath, "utf-8").trim();
    if (!content) return [];
    return content.split("\n").map((line) => {
      const entry = JSON.parse(line);
      if (typeof entry.createdAt === "string") entry.createdAt = new Date(entry.createdAt);
      return entry as AuditLogEntry;
    });
  }
}
