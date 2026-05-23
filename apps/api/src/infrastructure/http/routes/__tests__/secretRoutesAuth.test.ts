import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
import { secretRoutes } from "../secretRoutes.js";
import type { CreateSecret } from "../../../../application/CreateSecret.js";
import type { ListSecrets } from "../../../../application/ListSecrets.js";
import type { DeleteSecret } from "../../../../application/DeleteSecret.js";
import type { SetSecretValue } from "../../../../application/SetSecretValue.js";
import type { GetSecretValue } from "../../../../application/GetSecretValue.js";
import type { RevealSecretValue } from "../../../../application/RevealSecretValue.js";

const stub = <T>() => ({}) as T;

function buildApp(role: string) {
  const adminAuth = (_req: Request, res: Response, next: NextFunction) => {
    if (res.locals.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  };

  const reveal: RevealSecretValue = {
    async execute() {
      return { value: "plaintext-secret" } as ReturnType<RevealSecretValue["execute"]> extends Promise<infer R> ? R : never;
    },
  } as unknown as RevealSecretValue;

  const app = express();
  app.use((_req, res, next) => {
    res.locals.role = role;
    res.locals.userId = "u-1";
    next();
  });
  app.use(
    "/api",
    secretRoutes(
      stub<CreateSecret>(),
      stub<ListSecrets>(),
      stub<DeleteSecret>(),
      stub<SetSecretValue>(),
      stub<GetSecretValue>(),
      reveal,
      adminAuth,
    ),
  );
  return app;
}

describe("secretRoutes — reveal endpoint authorization", () => {
  it("rejects a non-admin with 403", async () => {
    const res = await request(buildApp("user")).post("/api/secrets/s-1/environments/e-1/reveal");
    expect(res.status).toBe(403);
  });

  it("rejects an editor with 403", async () => {
    const res = await request(buildApp("editor")).post("/api/secrets/s-1/environments/e-1/reveal");
    expect(res.status).toBe(403);
  });

  it("allows an admin through to the use case", async () => {
    const res = await request(buildApp("admin")).post("/api/secrets/s-1/environments/e-1/reveal");
    expect(res.status).toBe(200);
  });

  it("never returns the plaintext to a non-admin", async () => {
    const res = await request(buildApp("user")).post("/api/secrets/s-1/environments/e-1/reveal");
    expect(JSON.stringify(res.body)).not.toContain("plaintext-secret");
  });
});
