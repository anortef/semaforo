import { Router } from "express";
import type { GetPublicToggles } from "../../../application/GetPublicToggles.js";

export function publicRoutes(getPublicToggles: GetPublicToggles): Router {
  const router = Router();

  router.get(
    "/apps/:appKey/environments/:envKey/toggles",
    async (req, res) => {
      try {
        const toggles = await getPublicToggles.execute({
          appKey: req.params.appKey,
          envKey: req.params.envKey,
        });
        res.json(toggles);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Internal server error";
        if (message.includes("not found")) {
          res.status(404).json({ error: message });
        } else {
          res.status(500).json({ error: message });
        }
      }
    }
  );

  return router;
}
