import { Router } from "express";
import type { GetPublicToggles } from "../../../application/GetPublicToggles.js";

export function publicRoutes(getPublicToggles: GetPublicToggles): Router {
  const router = Router();

  /**
   * @openapi
   * /public/apps/{appKey}/environments/{envKey}/toggles:
   *   get:
   *     tags: [Public]
   *     summary: Get toggle states for client consumption
   *     description: Returns a key-value map of toggle names to boolean values. Responses are cached per environment.
   *     parameters:
   *       - in: path
   *         name: appKey
   *         required: true
   *         schema:
   *           type: string
   *         example: my-app
   *       - in: path
   *         name: envKey
   *         required: true
   *         schema:
   *           type: string
   *         example: production
   *     responses:
   *       200:
   *         description: Toggle states map
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               additionalProperties:
   *                 type: boolean
   *               example:
   *                 newCheckout: true
   *                 betaSearch: false
   *       404:
   *         description: App or environment not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
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
