import { Router } from "express";
import type { CreateFeatureToggle } from "../../../application/CreateFeatureToggle.js";
import type { SetToggleValue } from "../../../application/SetToggleValue.js";
import type { FeatureToggleRepository } from "@semaforo/domain";

export function toggleRoutes(
  createToggle: CreateFeatureToggle,
  setToggleValue: SetToggleValue,
  toggleRepository: FeatureToggleRepository
): Router {
  const router = Router();

  router.get("/apps/:appId/toggles", async (req, res) => {
    try {
      const toggles = await toggleRepository.findByAppId(req.params.appId);
      res.json(toggles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch toggles" });
    }
  });

  router.post("/apps/:appId/toggles", async (req, res) => {
    try {
      const toggle = await createToggle.execute({
        appId: req.params.appId,
        ...req.body,
      });
      res.status(201).json(toggle);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create toggle";
      res.status(400).json({ error: message });
    }
  });

  router.put("/toggles/:toggleId/environments/:environmentId", async (req, res) => {
    try {
      const value = await setToggleValue.execute({
        toggleId: req.params.toggleId,
        environmentId: req.params.environmentId,
        enabled: req.body.enabled,
      });
      res.json(value);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to set toggle value";
      res.status(400).json({ error: message });
    }
  });

  return router;
}
