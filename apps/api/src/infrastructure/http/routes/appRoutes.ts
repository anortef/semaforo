import { Router } from "express";
import type { CreateApp } from "../../../application/CreateApp.js";
import type { AppRepository } from "@semaforo/domain";

export function appRoutes(
  createApp: CreateApp,
  appRepository: AppRepository
): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      const apps = await appRepository.findAll();
      res.json(apps);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch apps" });
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
