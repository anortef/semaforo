import { Router } from "express";
import type { CreateApp } from "../../../application/CreateApp.js";
import type { ListApps } from "../../../application/ListApps.js";
import type { GetApp } from "../../../application/GetApp.js";
import type { GetAppMetrics } from "../../../application/GetAppMetrics.js";
import type { ExportApp } from "../../../application/ExportApp.js";
import type { ImportApp } from "../../../application/ImportApp.js";
import type { DeleteApp } from "../../../application/DeleteApp.js";
import type { RecordAuditEvent } from "../../../application/admin/RecordAuditEvent.js";
import type { GetAppAuditLog } from "../../../application/GetAppAuditLog.js";
import type { UserRepository } from "@semaforo/domain";

export function appRoutes(
  createApp: CreateApp,
  listApps: ListApps,
  getApp: GetApp,
  getAppMetrics?: GetAppMetrics,
  exportApp?: ExportApp,
  importApp?: ImportApp,
  audit?: RecordAuditEvent,
  getAppAuditLog?: GetAppAuditLog,
  userRepository?: UserRepository,
  deleteApp?: DeleteApp
): Router {
  const router = Router();

  /**
   * @openapi
   * /apps:
   *   get:
   *     tags: [Apps]
   *     summary: List all apps
   *     responses:
   *       200:
   *         description: List of apps
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/App'
   */
  router.get("/", async (_req, res) => {
    try {
      const apps = await listApps.execute();
      res.json(apps);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch apps" });
    }
  });

  /**
   * @openapi
   * /apps/{appId}:
   *   get:
   *     tags: [Apps]
   *     summary: Get app by ID
   *     parameters:
   *       - in: path
   *         name: appId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: App details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/App'
   *       404:
   *         description: App not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get("/:appId", async (req, res) => {
    try {
      const app = await getApp.execute(req.params.appId);
      res.json(app);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      if (message.includes("not found")) {
        res.status(404).json({ error: message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  /**
   * @openapi
   * /apps:
   *   post:
   *     tags: [Apps]
   *     summary: Create a new app
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, key]
   *             properties:
   *               name:
   *                 type: string
   *                 example: My App
   *               key:
   *                 type: string
   *                 example: my-app
   *                 description: Globally unique, lowercase with hyphens
   *               description:
   *                 type: string
   *                 example: A feature-flagged application
   *     responses:
   *       201:
   *         description: App created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/App'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post("/", async (req, res) => {
    try {
      const app = await createApp.execute({
          name: req.body.name,
          key: req.body.key,
          description: req.body.description,
        });
      audit?.execute({
        userId: res.locals.userId,
        action: "app.created",
        resourceType: "app",
        resourceId: app.id.value,
        details: JSON.stringify({ name: app.name, key: app.key }),
      });
      res.status(201).json(app);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create app";
      res.status(400).json({ error: message });
    }
  });

  if (getAppMetrics) {
    router.get("/:appId/metrics", async (req, res) => {
      try {
        const metrics = await getAppMetrics.execute(req.params.appId);
        res.json(metrics);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Internal server error";
        if (message.includes("not found")) {
          res.status(404).json({ error: message });
        } else {
          res.status(500).json({ error: "Internal server error" });
        }
      }
    });
  }

  if (exportApp) {
    router.get("/:appId/export", async (req, res) => {
      try {
        const data = await exportApp.execute(req.params.appId);
        res.setHeader("Content-Disposition", `attachment; filename="${data.app.key}-export.json"`);
        res.json(data);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Export failed";
        res.status(msg.includes("not found") ? 404 : 500).json({ error: msg });
      }
    });
  }

  if (importApp) {
    router.post("/import", async (req, res) => {
      try {
        await importApp.execute(req.body);
        res.status(201).json({ success: true });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Import failed";
        res.status(400).json({ error: msg });
      }
    });
  }

  if (getAppAuditLog && userRepository) {
    router.get("/:appId/audit-log", async (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const result = await getAppAuditLog.execute({ appId: req.params.appId, limit, offset });

        const actorIds = [...new Set(result.entries.map((e) => e.userId))];
        const names = new Map<string, string>();
        for (const id of actorIds) {
          const user = await userRepository.findById(id);
          names.set(id, user?.name ?? "Unknown");
        }

        const enriched = result.entries.map((e) => ({
          ...e,
          userName: names.get(e.userId) ?? "Unknown",
        }));

        res.json({ entries: enriched, total: result.total });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to fetch audit log";
        res.status(msg.includes("not found") ? 404 : 500).json({ error: msg });
      }
    });
  }

  if (deleteApp) {
    router.delete("/:appId", async (req, res) => {
      try {
        await deleteApp.execute(req.params.appId);
        audit?.execute({
          userId: res.locals.userId,
          action: "app.deleted",
          resourceType: "app",
          resourceId: req.params.appId,
        });
        res.status(204).end();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete app";
        if (message.includes("not found")) {
          res.status(404).json({ error: message });
        } else {
          res.status(500).json({ error: message });
        }
      }
    });
  }

  return router;
}
