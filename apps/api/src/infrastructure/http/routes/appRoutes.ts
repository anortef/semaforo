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

  router.get("/", async (_req, res) => {
    try {
      const apps = await listApps.execute();
      res.json(apps);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch apps" });
    }
  });

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
