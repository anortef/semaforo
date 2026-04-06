import { Router } from "express";
import type { AdminCreateUser } from "../../../application/admin/CreateUser.js";
import type { AdminListUsers } from "../../../application/admin/ListUsers.js";
import type { AdminUpdateUser } from "../../../application/admin/UpdateUser.js";
import type { AdminDeleteUser } from "../../../application/admin/DeleteUser.js";
import type { AdminResetUserPassword } from "../../../application/admin/ResetUserPassword.js";
import type { AdminListSystemSettings } from "../../../application/admin/ListSystemSettings.js";
import type { AdminUpdateSystemSetting } from "../../../application/admin/UpdateSystemSetting.js";
import type { AdminListAuditLog } from "../../../application/admin/ListAuditLog.js";
import type { RecordAuditEvent } from "../../../application/admin/RecordAuditEvent.js";
import type pg from "pg";
import type { ExportAll } from "../../../application/ExportAll.js";
import type { ImportAll } from "../../../application/ImportAll.js";

interface AdminRouteDeps {
  createUser: AdminCreateUser;
  listUsers: AdminListUsers;
  updateUser: AdminUpdateUser;
  deleteUser: AdminDeleteUser;
  resetPassword: AdminResetUserPassword;
  listSettings: AdminListSystemSettings;
  updateSetting: AdminUpdateSystemSetting;
  listAuditLog: AdminListAuditLog;
  recordAudit: RecordAuditEvent;
  pool: pg.Pool;
  exportAll?: ExportAll;
  importAll?: ImportAll;
}

export function adminRoutes(deps: AdminRouteDeps): Router {
  const router = Router();

  // --- Users ---
  router.get("/users", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await deps.listUsers.execute({ limit, offset });
      res.json(result);
    } catch {
      res.status(500).json({ error: "Failed to list users" });
    }
  });

  router.post("/users", async (req, res) => {
    try {
      const user = await deps.createUser.execute({
        email: req.body.email,
        name: req.body.name,
        password: req.body.password,
        role: req.body.role,
      });
      await deps.recordAudit.execute({
        userId: res.locals.userId,
        action: "user.created",
        resourceType: "user",
        resourceId: user.id.value,
        details: JSON.stringify({ email: user.email, role: user.role }),
      });
      res.status(201).json(user);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to create user";
      res.status(400).json({ error: msg });
    }
  });

  router.patch("/users/:userId", async (req, res) => {
    try {
      const updated = await deps.updateUser.execute({
        userId: req.params.userId,
        actingUserId: res.locals.userId,
        name: req.body.name,
        role: req.body.role,
        disabled: req.body.disabled,
      });
      await deps.recordAudit.execute({
        userId: res.locals.userId,
        action: "user.updated",
        resourceType: "user",
        resourceId: req.params.userId,
      });
      res.json(updated);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to update user";
      const status = msg.includes("not found") ? 404 : 400;
      res.status(status).json({ error: msg });
    }
  });

  router.delete("/users/:userId", async (req, res) => {
    try {
      await deps.deleteUser.execute({
        userId: req.params.userId,
        actingUserId: res.locals.userId,
      });
      await deps.recordAudit.execute({
        userId: res.locals.userId,
        action: "user.deleted",
        resourceType: "user",
        resourceId: req.params.userId,
      });
      res.status(204).send();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to delete user";
      const status = msg.includes("not found") ? 404 : 400;
      res.status(status).json({ error: msg });
    }
  });

  router.post("/users/:userId/reset-password", async (req, res) => {
    try {
      await deps.resetPassword.execute({
        userId: req.params.userId,
        newPassword: req.body.newPassword,
      });
      await deps.recordAudit.execute({
        userId: res.locals.userId,
        action: "user.password_reset",
        resourceType: "user",
        resourceId: req.params.userId,
      });
      res.status(204).send();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to reset password";
      const status = msg.includes("not found") ? 404 : 400;
      res.status(status).json({ error: msg });
    }
  });

  // --- Settings ---
  router.get("/settings", async (_req, res) => {
    try {
      const settings = await deps.listSettings.execute();
      res.json(settings);
    } catch {
      res.status(500).json({ error: "Failed to list settings" });
    }
  });

  router.put("/settings/:key", async (req, res) => {
    try {
      const setting = await deps.updateSetting.execute({
        key: req.params.key,
        value: req.body.value,
      });
      await deps.recordAudit.execute({
        userId: res.locals.userId,
        action: "setting.updated",
        resourceType: "setting",
        resourceId: req.params.key,
        details: JSON.stringify({ value: req.body.value }),
      });
      res.json(setting);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to update setting";
      res.status(400).json({ error: msg });
    }
  });

  // --- Audit Log ---
  router.get("/audit-log", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await deps.listAuditLog.execute({ limit, offset });
      res.json(result);
    } catch {
      res.status(500).json({ error: "Failed to list audit log" });
    }
  });

  // --- Health ---
  router.get("/health", async (_req, res) => {
    try {
      await deps.pool.query("SELECT 1");
      const userCount = await deps.pool.query("SELECT COUNT(*)::int AS count FROM users");
      const appCount = await deps.pool.query("SELECT COUNT(*)::int AS count FROM apps");
      res.json({
        database: "ok",
        users: userCount.rows[0].count,
        apps: appCount.rows[0].count,
        uptime: process.uptime(),
      });
    } catch {
      res.status(503).json({ database: "error" });
    }
  });

  // --- Export/Import ---
  if (deps.exportAll) {
    router.get("/export", async (_req, res) => {
      try {
        const data = await deps.exportAll!.execute();
        res.setHeader("Content-Disposition", 'attachment; filename="semaforo-export.json"');
        res.json(data);
      } catch {
        res.status(500).json({ error: "Export failed" });
      }
    });
  }

  if (deps.importAll) {
    router.post("/import", async (req, res) => {
      try {
        await deps.importAll!.execute(req.body);
        await deps.recordAudit.execute({
          userId: res.locals.userId,
          action: "system.import",
          resourceType: "system",
          resourceId: "import",
        });
        res.status(201).json({ success: true });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Import failed";
        res.status(400).json({ error: msg });
      }
    });
  }

  return router;
}
