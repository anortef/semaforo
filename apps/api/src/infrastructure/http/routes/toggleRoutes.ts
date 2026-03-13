import { Router } from "express";
import type { CreateFeatureToggle } from "../../../application/CreateFeatureToggle.js";
import type { SetToggleValue } from "../../../application/SetToggleValue.js";
import type { ListToggles } from "../../../application/ListToggles.js";

export function toggleRoutes(
  createToggle: CreateFeatureToggle,
  setToggleValue: SetToggleValue,
  listToggles: ListToggles
): Router {
  const router = Router();

  router.get("/apps/:appId/toggles", async (req, res) => {
    try {
      const toggles = await listToggles.execute(req.params.appId);
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
      if (message.includes("not found")) {
        res.status(404).json({ error: message });
      } else {
        res.status(400).json({ error: message });
      }
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
      if (message.includes("not found")) {
        res.status(404).json({ error: message });
      } else {
        res.status(400).json({ error: message });
      }
    }
  });

  return router;
}
