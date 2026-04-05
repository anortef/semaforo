import { Router } from "express";
import type { CreateFeatureToggle } from "../../../application/CreateFeatureToggle.js";
import type { SetToggleValue } from "../../../application/SetToggleValue.js";
import type { ListToggles } from "../../../application/ListToggles.js";
import type { GetPublicToggles } from "../../../application/GetPublicToggles.js";

export function toggleRoutes(
  createToggle: CreateFeatureToggle,
  setToggleValue: SetToggleValue,
  listToggles: ListToggles,
  getPublicToggles?: GetPublicToggles
): Router {
  const router = Router();

  /**
   * @openapi
   * /apps/{appId}/toggles:
   *   get:
   *     tags: [Toggles]
   *     summary: List toggles for an app
   *     parameters:
   *       - in: path
   *         name: appId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: List of feature toggles
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/FeatureToggle'
   */
  router.get("/apps/:appId/toggles", async (req, res) => {
    try {
      const toggles = await listToggles.execute(req.params.appId);
      res.json(toggles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch toggles" });
    }
  });

  /**
   * @openapi
   * /apps/{appId}/toggles:
   *   post:
   *     tags: [Toggles]
   *     summary: Create a new feature toggle
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
   *                 example: New Checkout
   *               key:
   *                 type: string
   *                 example: newCheckout
   *                 description: camelCase, unique per app
   *               description:
   *                 type: string
   *                 example: Enables the new checkout flow
   *     responses:
   *       201:
   *         description: Toggle created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/FeatureToggle'
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
  router.post("/apps/:appId/toggles", async (req, res) => {
    try {
      const toggle = await createToggle.execute({
        appId: req.params.appId,
        name: req.body.name,
        key: req.body.key,
        description: req.body.description,
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

  /**
   * @openapi
   * /toggles/{toggleId}/environments/{environmentId}:
   *   put:
   *     tags: [Toggles]
   *     summary: Set toggle value for an environment
   *     parameters:
   *       - in: path
   *         name: toggleId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
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
   *             required: [enabled]
   *             properties:
   *               enabled:
   *                 type: boolean
   *                 example: true
   *     responses:
   *       200:
   *         description: Toggle value set
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ToggleValue'
   *       404:
   *         description: Toggle or environment not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
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

  if (getPublicToggles) {
    router.get(
      "/apps/:appKey/environments/:envKey/toggle-states",
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
            res.status(500).json({ error: "Internal server error" });
          }
        }
      }
    );
  }

  return router;
}
