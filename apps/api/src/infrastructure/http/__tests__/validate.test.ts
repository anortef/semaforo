import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { z } from "zod";
import { validateBody, schemas } from "../validate.js";

function buildApp(schema: z.ZodTypeAny) {
  const app = express();
  app.use(express.json());
  app.post("/echo", validateBody(schema), (req, res) => {
    res.json({ body: req.body });
  });
  return app;
}

describe("validateBody", () => {
  it("returns 400 with a useful error path when a required field is missing", async () => {
    const schema = z.object({ name: z.string() });
    const res = await request(buildApp(schema)).post("/echo").send({});

    expect(res.status).toBe(400);
  });

  it("includes the offending field name in the error", async () => {
    const schema = z.object({ email: schemas.email });
    const res = await request(buildApp(schema)).post("/echo").send({ email: "not-an-email" });

    expect(res.body.error).toContain("email");
  });

  it("forwards the parsed value to the route handler on success", async () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const res = await request(buildApp(schema)).post("/echo").send({ name: "Alice", age: 30 });

    expect(res.body.body).toEqual({ name: "Alice", age: 30 });
  });

  it("rejects extra fields when schema is strict", async () => {
    const schema = z.object({ name: z.string() }).strict();
    const res = await request(buildApp(schema)).post("/echo").send({ name: "x", evil: "<script>" });

    expect(res.status).toBe(400);
  });

  it("rejects email at the schema level — not the use case", async () => {
    const schema = z.object({ email: schemas.email });
    const res = await request(buildApp(schema)).post("/echo").send({ email: "" });

    expect(res.status).toBe(400);
  });

  it("rejects an app key with uppercase letters via the schema", async () => {
    const schema = z.object({ key: schemas.appKey });
    const res = await request(buildApp(schema)).post("/echo").send({ key: "MyApp" });

    expect(res.status).toBe(400);
  });

  it("rejects a cacheTtlSeconds value above 86400", async () => {
    const schema = z.object({ cacheTtlSeconds: schemas.cacheTtlSeconds });
    const res = await request(buildApp(schema)).post("/echo").send({ cacheTtlSeconds: 100_000 });

    expect(res.status).toBe(400);
  });

  it("rejects a rollout percentage outside 0..100", async () => {
    const schema = z.object({ rolloutPercentage: schemas.rolloutPercentage });
    const res = await request(buildApp(schema)).post("/echo").send({ rolloutPercentage: 150 });

    expect(res.status).toBe(400);
  });

  it("rejects an unknown user role", async () => {
    const schema = z.object({ role: schemas.userRole });
    const res = await request(buildApp(schema)).post("/echo").send({ role: "superadmin" });

    expect(res.status).toBe(400);
  });
});
