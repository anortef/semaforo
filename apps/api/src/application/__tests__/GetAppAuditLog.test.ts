import { describe, it, expect, beforeEach } from "vitest";
import { GetAppAuditLog } from "../GetAppAuditLog.js";
import { createApp, createEnvironment, createFeatureToggle, createAuditLogEntry } from "@semaforo/domain";
import type { AuditLogEntry, AuditLogRepository } from "@semaforo/domain";
import { InMemoryAppRepository, InMemoryEnvironmentRepository, InMemoryFeatureToggleRepository } from "./InMemoryRepos.js";

class InMemoryAuditLogRepository implements AuditLogRepository {
  entries: AuditLogEntry[] = [];
  async save(entry: AuditLogEntry) { this.entries.push(entry); }
  async findAll(params: { limit: number; offset: number }) {
    return this.entries.slice(params.offset, params.offset + params.limit);
  }
  async countAll() { return this.entries.length; }
  async findByUserId() { return []; }
  async findByResourceIds(ids: string[], params: { limit: number; offset: number }) {
    return this.entries
      .filter((e) => ids.includes(e.resourceId))
      .slice(params.offset, params.offset + params.limit);
  }
  async countByResourceIds(ids: string[]) {
    return this.entries.filter((e) => ids.includes(e.resourceId)).length;
  }
}

describe("GetAppAuditLog", () => {
  let appRepo: InMemoryAppRepository;
  let envRepo: InMemoryEnvironmentRepository;
  let toggleRepo: InMemoryFeatureToggleRepository;
  let auditRepo: InMemoryAuditLogRepository;
  let useCase: GetAppAuditLog;

  beforeEach(() => {
    appRepo = new InMemoryAppRepository();
    envRepo = new InMemoryEnvironmentRepository();
    toggleRepo = new InMemoryFeatureToggleRepository();
    auditRepo = new InMemoryAuditLogRepository();
    useCase = new GetAppAuditLog(appRepo, envRepo, toggleRepo, auditRepo);

    appRepo.save(createApp({ id: "app-1", name: "Shop", key: "shop" }));
    envRepo.save(createEnvironment({ id: "env-1", appId: "app-1", name: "Prod", key: "prod" }));
    toggleRepo.save(createFeatureToggle({ id: "t-1", appId: "app-1", name: "Checkout", key: "checkout" }));

    auditRepo.save(createAuditLogEntry({ id: "a-1", userId: "u-1", action: "app.created", resourceType: "app", resourceId: "app-1" }));
    auditRepo.save(createAuditLogEntry({ id: "a-2", userId: "u-1", action: "toggle.created", resourceType: "toggle", resourceId: "t-1" }));
    auditRepo.save(createAuditLogEntry({ id: "a-3", userId: "u-1", action: "environment.created", resourceType: "environment", resourceId: "env-1" }));
    auditRepo.save(createAuditLogEntry({ id: "a-4", userId: "u-1", action: "app.created", resourceType: "app", resourceId: "app-2" }));
  });

  it("returns only entries for the given app", async () => {
    const result = await useCase.execute({ appId: "app-1", limit: 50, offset: 0 });

    expect(result.entries).toHaveLength(3);
  });

  it("excludes entries for other apps", async () => {
    const result = await useCase.execute({ appId: "app-1", limit: 50, offset: 0 });
    const ids = result.entries.map((e) => e.resourceId);

    expect(ids).not.toContain("app-2");
  });

  it("returns total count", async () => {
    const result = await useCase.execute({ appId: "app-1", limit: 50, offset: 0 });

    expect(result.total).toBe(3);
  });

  it("throws for non-existent app", async () => {
    await expect(
      useCase.execute({ appId: "nope", limit: 50, offset: 0 })
    ).rejects.toThrow("App not found");
  });
});
