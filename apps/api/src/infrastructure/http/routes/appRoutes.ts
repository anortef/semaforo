import { Router } from "express";
import type { CreateApp } from "../../../application/CreateApp.js";
import type { ListApps } from "../../../application/ListApps.js";
import type { GetApp } from "../../../application/GetApp.js";

export function appRoutes(
  createApp: CreateApp,
  listApps: ListApps,
  getApp: GetApp
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
        res.status(500).json({ error: message });
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
      const app = await createApp.execute(req.body);
      res.status(201).json(app);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create app";
      res.status(400).json({ error: message });
    }
  });

  return router;
}
