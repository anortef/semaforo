import { Router } from "express";
import type { CreateSecret } from "../../../application/CreateSecret.js";
import type { ListSecrets } from "../../../application/ListSecrets.js";
import type { DeleteSecret } from "../../../application/DeleteSecret.js";
import type { SetSecretValue } from "../../../application/SetSecretValue.js";
import type { GetSecretValue } from "../../../application/GetSecretValue.js";
import type { RevealSecretValue } from "../../../application/RevealSecretValue.js";
import type { RecordAuditEvent } from "../../../application/admin/RecordAuditEvent.js";

export function secretRoutes(
  createSecret: CreateSecret,
  listSecrets: ListSecrets,
  deleteSecret: DeleteSecret,
  setSecretValue: SetSecretValue,
  getSecretValue: GetSecretValue,
  revealSecretValue: RevealSecretValue,
  audit?: RecordAuditEvent
): Router {
  const router = Router();

  router.get("/apps/:appId/secrets", async (req, res) => {
    try {
      const secrets = await listSecrets.execute(req.params.appId);
      res.json(secrets);
    } catch {
      res.status(500).json({ error: "Failed to fetch secrets" });
    }
  });

  router.post("/apps/:appId/secrets", async (req, res) => {
    try {
      const secret = await createSecret.execute({
        appId: req.params.appId,
        key: req.body.key,
        description: req.body.description,
      });
      audit?.execute({
        userId: res.locals.userId,
        action: "secret.created",
        resourceType: "secret",
        resourceId: secret.id.value,
        details: JSON.stringify({ key: secret.key }),
      });
      res.status(201).json(secret);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create secret";
      if (message.includes("not found")) {
        res.status(404).json({ error: message });
      } else {
        res.status(400).json({ error: message });
      }
    }
  });

  router.delete("/secrets/:secretId", async (req, res) => {
    try {
      await deleteSecret.execute(req.params.secretId);
      audit?.execute({
        userId: res.locals.userId,
        action: "secret.deleted",
        resourceType: "secret",
        resourceId: req.params.secretId,
        details: "{}",
      });
      res.status(204).end();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete secret";
      if (message.includes("not found")) {
        res.status(404).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  });

  router.put("/secrets/:secretId/environments/:envId", async (req, res) => {
    try {
      await setSecretValue.execute({
        secretId: req.params.secretId,
        environmentId: req.params.envId,
        plainValue: req.body.value,
      });
      audit?.execute({
        userId: res.locals.userId,
        action: "secret.value_changed",
        resourceType: "secret",
        resourceId: req.params.secretId,
        details: JSON.stringify({ environmentId: req.params.envId }),
      });
      res.json({ updated: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to set secret value";
      if (message.includes("not found")) {
        res.status(404).json({ error: message });
      } else {
        res.status(400).json({ error: message });
      }
    }
  });

  router.get("/secrets/:secretId/environments/:envId", async (req, res) => {
    try {
      const result = await getSecretValue.execute({
        secretId: req.params.secretId,
        environmentId: req.params.envId,
      });
      if (!result) {
        res.status(404).json({ error: "Secret value not found" });
        return;
      }
      res.json(result);
    } catch {
      res.status(500).json({ error: "Failed to fetch secret value" });
    }
  });

  router.post("/secrets/:secretId/environments/:envId/reveal", async (req, res) => {
    try {
      const result = await revealSecretValue.execute({
        secretId: req.params.secretId,
        environmentId: req.params.envId,
      });
      audit?.execute({
        userId: res.locals.userId,
        action: "secret.revealed",
        resourceType: "secret",
        resourceId: req.params.secretId,
        details: JSON.stringify({ environmentId: req.params.envId }),
      });
      res.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reveal secret";
      if (message.includes("not found")) {
        res.status(404).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  });

  return router;
}
