import { Router } from "express";
import type { CreateEnvironment } from "../../../application/CreateEnvironment.js";
import type { ListEnvironments } from "../../../application/ListEnvironments.js";

export function environmentRoutes(
  createEnvironment: CreateEnvironment,
  listEnvironments: ListEnvironments
): Router {
  const router = Router();

  router.get("/apps/:appId/environments", async (req, res) => {
    try {
      const environments = await listEnvironments.execute(req.params.appId);
      res.json(environments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch environments" });
    }
  });

  router.post("/apps/:appId/environments", async (req, res) => {
    try {
      const environment = await createEnvironment.execute({
        appId: req.params.appId,
        ...req.body,
      });
      res.status(201).json(environment);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create environment";
      if (message.includes("not found")) {
        res.status(404).json({ error: message });
      } else {
        res.status(400).json({ error: message });
      }
    }
  });

  return router;
}
