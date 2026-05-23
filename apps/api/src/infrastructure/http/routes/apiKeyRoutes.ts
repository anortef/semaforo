import { Router } from "express";
import type { CreateApiKey } from "../../../application/CreateApiKey.js";
import type { ListApiKeys } from "../../../application/ListApiKeys.js";
import type { DeleteApiKey } from "../../../application/DeleteApiKey.js";
import type { SecurityLogger } from "../../logging/securityLogger.js";

export function apiKeyRoutes(
  createApiKey: CreateApiKey,
  listApiKeys: ListApiKeys,
  deleteApiKey: DeleteApiKey,
  logger?: SecurityLogger
): Router {
  const router = Router();

  router.get("/:environmentId/api-keys", async (req, res) => {
    try {
      const { keys, freshPlaintext } = await listApiKeys.execute(req.params.environmentId);
      // `keys` is the safe list — never contains plaintext. `plaintext` is
      // only populated when a key was auto-provisioned during this request,
      // and must be surfaced to the caller exactly once.
      res.json({ keys, plaintext: freshPlaintext });
    } catch {
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  });

  router.post("/:environmentId/api-keys", async (req, res) => {
    try {
      const { apiKey, plaintext } = await createApiKey.execute({
        environmentId: req.params.environmentId,
      });
      logger?.apiKeyCreated(req.params.environmentId, apiKey.id.value);
      // Returning the plaintext here is the one-and-only moment the caller
      // will ever see it; the database only has the hash.
      res.status(201).json({ apiKey, plaintext });
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
      logger?.apiKeyDeleted(req.params.keyId);
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
