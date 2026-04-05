import { Router } from "express";
import type { CreateApiKey } from "../../../application/CreateApiKey.js";
import type { ListApiKeys } from "../../../application/ListApiKeys.js";
import type { DeleteApiKey } from "../../../application/DeleteApiKey.js";

export function apiKeyRoutes(
  createApiKey: CreateApiKey,
  listApiKeys: ListApiKeys,
  deleteApiKey: DeleteApiKey
): Router {
  const router = Router();

  /**
   * @openapi
   * /apps/{appId}/api-keys:
   *   get:
   *     tags: [API Keys]
   *     summary: List API keys for an app
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: appId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of API keys
   */
  router.get("/:appId/api-keys", async (req, res) => {
    try {
      const keys = await listApiKeys.execute(req.params.appId);
      res.json(keys);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  });

  /**
   * @openapi
   * /apps/{appId}/api-keys:
   *   post:
   *     tags: [API Keys]
   *     summary: Create an API key for an app
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: appId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name]
   *             properties:
   *               name:
   *                 type: string
   *                 example: Production Key
   *     responses:
   *       201:
   *         description: API key created (key shown only once)
   *       404:
   *         description: App not found
   */
  router.post("/:appId/api-keys", async (req, res) => {
    try {
      const key = await createApiKey.execute({
        appId: req.params.appId,
        name: req.body.name,
      });
      res.status(201).json(key);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create API key";
      const status = message.includes("not found") ? 404 : 400;
      res.status(status).json({ error: message });
    }
  });

  /**
   * @openapi
   * /api-keys/{keyId}:
   *   delete:
   *     tags: [API Keys]
   *     summary: Delete an API key
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: keyId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: API key deleted
   *       404:
   *         description: API key not found
   */
  router.delete("/:keyId", async (req, res) => {
    try {
      await deleteApiKey.execute(req.params.keyId);
      res.status(204).send();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete API key";
      const status = message.includes("not found") ? 404 : 500;
      res.status(status).json({ error: message });
    }
  });

  return router;
}
