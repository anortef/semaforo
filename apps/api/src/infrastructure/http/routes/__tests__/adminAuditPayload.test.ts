import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { adminRoutes } from "../adminRoutes.js";
import { RecordAuditEvent } from "../../../../application/admin/RecordAuditEvent.js";
import { AdminUpdateSystemSetting } from "../../../../application/admin/UpdateSystemSetting.js";
import {
  InMemorySystemSettingRepository,
  InMemoryAuditLogRepository,
} from "../../../../application/__tests__/admin/InMemoryRepos.js";

const stub = <T>() => ({}) as T;

describe("admin setting update — audit detail payload", () => {
  it("never copies the raw setting value into the audit log details", async () => {
    const settingRepo = new InMemorySystemSettingRepository();
    const auditRepo = new InMemoryAuditLogRepository();
    const recordAudit = new RecordAuditEvent(auditRepo);
    const updateSetting = new AdminUpdateSystemSetting(settingRepo);

    const app = express();
    app.use(express.json());
    app.use((_req, res, next) => {
      res.locals.userId = "admin-1";
      next();
    });
    app.use(
      "/admin",
      adminRoutes({
        createUser: stub(),
        listUsers: stub(),
        updateUser: stub(),
        deleteUser: stub(),
        resetPassword: stub(),
        listSettings: stub(),
        updateSetting,
        listAuditLog: stub(),
        recordAudit,
        pool: stub(),
        userRepository: stub(),
        appRepository: stub(),
        environmentRepository: stub(),
        toggleRepository: stub(),
        secretRepository: stub(),
        exportAll: stub(),
        importAll: stub(),
        scheduledBackup: stub(),
      }),
    );

    const sensitiveValue = "very-secret-bearer-token-aaa";
    const res = await request(app)
      .put("/admin/settings/somekey")
      .send({ value: sensitiveValue });

    expect(res.status).toBe(200);
    const entries = auditRepo.entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]!.details).not.toContain(sensitiveValue);
  });
});
