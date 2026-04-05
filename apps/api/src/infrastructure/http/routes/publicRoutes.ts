import { Router } from "express";
import type { GetPublicToggles } from "../../../application/GetPublicToggles.js";
import type { EnvironmentRepository, AppRepository } from "@semaforo/domain";

export function publicRoutes(
  getPublicToggles: GetPublicToggles,
  environmentRepository?: EnvironmentRepository,
  appRepository?: AppRepository
): Router {
  const router = Router();

  /**
   * @openapi
   * /public/toggles:
   *   get:
   *     tags: [Public]
   *     summary: Get toggle states using only the API key
   *     description: Returns toggle states for the environment associated with the API key. No need to know app or environment keys.
   *     parameters:
   *       - in: header
   *         name: x-api-key
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: apiKey
   *         schema:
   *           type: string
   *         description: Alternative to x-api-key header
   *     responses:
   *       200:
   *         description: Toggle states map
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               additionalProperties:
   *                 type: boolean
   *       404:
   *         description: Environment or app not found
   */
  if (environmentRepository && appRepository) {
    router.get("/toggles", async (_req, res) => {
      try {
        const environmentId = res.locals.apiKeyEnvironmentId as string;
        const env = await environmentRepository.findById(environmentId);
        if (!env) {
          res.status(404).json({ error: "Environment not found" });
          return;
        }

        const app = await appRepository.findById(env.appId);
        if (!app) {
          res.status(404).json({ error: "App not found" });
          return;
        }

        const toggles = await getPublicToggles.execute({
          appKey: app.key,
          envKey: env.key,
        });
        res.json(toggles);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Internal server error";
        res.status(500).json({ error: message });
      }
    });
  }

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
