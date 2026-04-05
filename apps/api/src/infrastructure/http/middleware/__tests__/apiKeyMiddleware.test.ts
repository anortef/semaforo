import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { createApiKeyMiddleware } from "../apiKeyMiddleware.js";
import { createApiKey, type ApiKey, type ApiKeyRepository } from "@semaforo/domain";

class InMemoryApiKeyRepository implements ApiKeyRepository {
  private keys: ApiKey[] = [];

  constructor(keys: ApiKey[] = []) {
    this.keys = keys;
  }
  async findById(id: string): Promise<ApiKey | null> {
    return this.keys.find((k) => k.id.value === id) ?? null;
  }
  async findByKey(key: string): Promise<ApiKey | null> {
    return this.keys.find((k) => k.key === key) ?? null;
  }
  async findByEnvironmentId(environmentId: string): Promise<ApiKey[]> {
    return this.keys.filter((k) => k.environmentId === environmentId);
  }
  async save(apiKey: ApiKey): Promise<void> {
    this.keys.push(apiKey);
  }
  async delete(id: string): Promise<void> {
    this.keys = this.keys.filter((k) => k.id.value !== id);
  }
}

const testKey = createApiKey({
  id: "key-1",
  environmentId: "env-1",
  name: "Test",
  key: "sk_test123",
});

function buildApp(keys: ApiKey[] = [testKey]) {
  const repo = new InMemoryApiKeyRepository(keys);
  const app = express();
  app.use(createApiKeyMiddleware(repo));
  app.get("/test", (_req, res) => {
    res.json({ ok: true, environmentId: res.locals.apiKeyEnvironmentId });
  });
  return app;
}

describe("apiKeyMiddleware", () => {
  it("returns 401 when no API key provided", async () => {
    const res = await request(buildApp()).get("/test");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("API key required");
  });

  it("accepts API key via x-api-key header", async () => {
    const res = await request(buildApp())
      .get("/test")
      .set("x-api-key", "sk_test123");
    expect(res.status).toBe(200);
    expect(res.body.environmentId).toBe("env-1");
  });

  it("accepts API key via apiKey query param", async () => {
    const res = await request(buildApp()).get("/test?apiKey=sk_test123");
    expect(res.status).toBe(200);
    expect(res.body.environmentId).toBe("env-1");
  });

  it("prefers header over query param", async () => {
    const key2 = createApiKey({
      id: "key-2",
      environmentId: "env-2",
      name: "Other",
      key: "sk_other456",
    });
    const res = await request(buildApp([testKey, key2]))
      .get("/test?apiKey=sk_other456")
      .set("x-api-key", "sk_test123");
    expect(res.status).toBe(200);
    expect(res.body.environmentId).toBe("env-1");
  });

  it("returns 401 for invalid API key", async () => {
    const res = await request(buildApp())
      .get("/test")
      .set("x-api-key", "sk_invalid");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid API key");
  });
});
