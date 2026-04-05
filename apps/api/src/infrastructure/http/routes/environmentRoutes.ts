import { Router } from "express";
import type { AppRepository, EnvironmentRepository } from "@semaforo/domain";
import type { CreateEnvironment } from "../../../application/CreateEnvironment.js";
import type { ListEnvironments } from "../../../application/ListEnvironments.js";
import type { UpdateEnvironment } from "../../../application/UpdateEnvironment.js";
import type { ToggleCache } from "../../cache/RedisToggleCache.js";

export function environmentRoutes(
  createEnvironment: CreateEnvironment,
  listEnvironments: ListEnvironments,
  updateEnvironment: UpdateEnvironment,
  appRepository: AppRepository,
  environmentRepository: EnvironmentRepository,
  cache: ToggleCache
): Router {
  const router = Router();

  /**
   * @openapi
   * /apps/{appId}/environments:
   *   get:
   *     tags: [Environments]
   *     summary: List environments for an app
   *     parameters:
   *       - in: path
   *         name: appId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: List of environments
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Environment'
   */
  router.get("/apps/:appId/environments", async (req, res) => {
    try {
      const environments = await listEnvironments.execute(req.params.appId);
      res.json(environments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch environments" });
    }
  });

  /**
   * @openapi
   * /apps/{appId}/environments:
   *   post:
   *     tags: [Environments]
   *     summary: Create a new environment
   *     parameters:
   *       - in: path
   *         name: appId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
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
   *                 example: Production
   *               key:
   *                 type: string
   *                 example: production
   *               cacheTtlSeconds:
   *                 type: number
   *                 example: 300
   *     responses:
   *       201:
   *         description: Environment created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Environment'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: App not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post("/apps/:appId/environments", async (req, res) => {
    try {
      const environment = await createEnvironment.execute({
        appId: req.params.appId,
        name: req.body.name,
        key: req.body.key,
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

  /**
   * @openapi
   * /environments/{environmentId}:
   *   patch:
   *     tags: [Environments]
   *     summary: Update an environment
   *     parameters:
   *       - in: path
   *         name: environmentId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               cacheTtlSeconds:
   *                 type: number
   *     responses:
   *       200:
   *         description: Environment updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Environment'
   *       404:
   *         description: Environment not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.patch("/environments/:environmentId", async (req, res) => {
    try {
      const environment = await updateEnvironment.execute({
        environmentId: req.params.environmentId,
        name: req.body.name,
        cacheTtlSeconds: req.body.cacheTtlSeconds,
      });
      res.json(environment);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update environment";
      if (message.includes("not found")) {
        res.status(404).json({ error: message });
      } else {
        res.status(400).json({ error: message });
      }
    }
  });

  /**
   * @openapi
   * /environments/{environmentId}/cache:
   *   delete:
   *     tags: [Environments]
   *     summary: Clear cache for an environment
   *     parameters:
   *       - in: path
   *         name: environmentId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Cache cleared
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 cleared:
   *                   type: boolean
   *                   example: true
   *       404:
   *         description: Environment or app not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.delete("/environments/:environmentId/cache", async (req, res) => {
    try {
      const env = await environmentRepository.findById(req.params.environmentId);
      if (!env) {
        res.status(404).json({ error: "Environment not found" });
        return;
      }

      const app = await appRepository.findById(env.appId);
      if (!app) {
        res.status(404).json({ error: "App not found" });
        return;
      }

      await cache.invalidate(app.key, env.key);
      res.json({ cleared: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  return router;
}
