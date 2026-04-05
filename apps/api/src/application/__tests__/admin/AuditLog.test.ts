import { describe, it, expect, beforeEach } from "vitest";
import { AdminListAuditLog } from "../../admin/ListAuditLog.js";
import { RecordAuditEvent } from "../../admin/RecordAuditEvent.js";
import { InMemoryAuditLogRepository } from "./InMemoryRepos.js";

describe("RecordAuditEvent", () => {
  let repo: InMemoryAuditLogRepository;
  let useCase: RecordAuditEvent;

  beforeEach(() => {
    repo = new InMemoryAuditLogRepository();
    useCase = new RecordAuditEvent(repo);
  });

  it("saves an audit log entry", async () => {
    await useCase.execute({
      userId: "u1",
      action: "user.created",
      resourceType: "user",
      resourceId: "u2",
    });

    expect(repo.entries).toHaveLength(1);
  });
});

describe("AdminListAuditLog", () => {
  let repo: InMemoryAuditLogRepository;
  let record: RecordAuditEvent;
  let list: AdminListAuditLog;

  beforeEach(async () => {
    repo = new InMemoryAuditLogRepository();
    record = new RecordAuditEvent(repo);
    list = new AdminListAuditLog(repo);

    await record.execute({ userId: "u1", action: "user.created", resourceType: "user", resourceId: "u2" });
    await record.execute({ userId: "u1", action: "setting.updated", resourceType: "setting", resourceId: "publicDomain" });
  });

  it("returns paginated entries", async () => {
    const result = await list.execute({ limit: 10, offset: 0 });

    expect(result.entries).toHaveLength(2);
  });

  it("returns total count", async () => {
    const result = await list.execute({ limit: 10, offset: 0 });

    expect(result.total).toBe(2);
  });
});
