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

  router.get("/:environmentId/api-keys", async (req, res) => {
    try {
      const keys = await listApiKeys.execute(req.params.environmentId);
      res.json(keys);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  });

  router.post("/:environmentId/api-keys", async (req, res) => {
    try {
      const key = await createApiKey.execute({
        environmentId: req.params.environmentId,
      });
      res.status(201).json(key);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create API key";
      const status = message.includes("not found") ? 404 : 400;
      res.status(status).json({ error: message });
    }
  });

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
