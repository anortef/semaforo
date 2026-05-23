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

  it("error message starts with the 'Invalid request:' prefix", async () => {
    const schema = z.object({ name: z.string() });
    const res = await request(buildApp(schema)).post("/echo").send({});

    expect(res.body.error.startsWith("Invalid request:")).toBe(true);
  });

  it("error message names the top-level offending field", async () => {
    const schema = z.object({ name: z.string() });
    const res = await request(buildApp(schema)).post("/echo").send({});

    expect(res.body.error).toContain("name");
  });

  it("error message joins a nested path with a '.' separator", async () => {
    const schema = z.object({ user: z.object({ email: schemas.email }) });
    const res = await request(buildApp(schema)).post("/echo").send({ user: { email: "x" } });

    expect(res.body.error).toContain("user.email");
  });

  it("error message echoes the zod issue message verbatim for invalid email", async () => {
    const schema = z.object({ email: schemas.email });
    const res = await request(buildApp(schema)).post("/echo").send({ email: "not-an-email" });

    // zod's default invalid-email message is "Invalid email"; assert presence to
    // ensure the middleware actually forwards `first.message` and didn't
    // collapse to the "is invalid" fallback.
    expect(res.body.error).toMatch(/Invalid email/);
  });

  it("error message falls back to 'body' when the issue path array is empty", async () => {
    // A `.refine` without an explicit `path` produces an issue whose `path`
    // is []. The middleware must then label the offender as "body" so the
    // user gets a meaningful field name even when zod can't supply one.
    const schema = z
      .object({ a: z.string(), b: z.string() })
      .refine((v) => v.a === v.b, { message: "fields must match" });
    const res = await request(buildApp(schema)).post("/echo").send({ a: "x", b: "y" });

    expect(res.body.error).toContain("body");
  });

  it("error message reports the path token, not the literal word 'true'", async () => {
    // Guards against a `path || "body"` mutation that would substitute the
    // expression with a truthy non-string value.
    const schema = z.object({ name: z.string() });
    const res = await request(buildApp(schema)).post("/echo").send({ name: 42 });

    expect(res.body.error).not.toContain(" true ");
    expect(res.body.error).toContain("name");
  });
});
