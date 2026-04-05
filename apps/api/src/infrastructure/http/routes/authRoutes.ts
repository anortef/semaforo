import { Router } from "express";
import type { Login } from "../../../application/Login.js";
import { createAuthMiddleware } from "../middleware/authMiddleware.js";

export function authRoutes(login: Login, jwtSecret: string): Router {
  const router = Router();
  const auth = createAuthMiddleware(jwtSecret);

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Login with email and password
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email:
   *                 type: string
   *                 example: admin@semaforo.local
   *               password:
   *                 type: string
   *                 example: admin
   *     responses:
   *       200:
   *         description: JWT token
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token:
   *                   type: string
   *       401:
   *         description: Invalid credentials
   */
  router.post("/login", async (req, res) => {
    try {
      const result = await login.execute(req.body);
      res.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Login failed";
      res.status(401).json({ error: message });
    }
  });

  /**
   * @openapi
   * /auth/me:
   *   get:
   *     tags: [Auth]
   *     summary: Get current user info
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Current user info from token
   *       401:
   *         description: Not authenticated
   */
  router.get("/me", auth, (_req, res) => {
    res.json({
      userId: res.locals.userId,
      email: res.locals.email,
      role: res.locals.role,
    });
  });

  return router;
}
