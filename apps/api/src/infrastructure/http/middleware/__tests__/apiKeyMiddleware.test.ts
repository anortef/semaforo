import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { createApiKeyMiddleware } from "../apiKeyMiddleware.js";
import { createApiKey, type ApiKey, type ApiKeyRepository } from "@semaforo/domain";
import { hashApiKey } from "../../../crypto/hashApiKey.js";

class InMemoryApiKeyRepository implements ApiKeyRepository {
  keys: ApiKey[] = [];

  constructor(keys: ApiKey[] = []) {
    this.keys = keys;
  }
  async findById(id: string): Promise<ApiKey | null> {
    return this.keys.find((k) => k.id.value === id) ?? null;
  }
  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    return this.keys.find((k) => k.keyHash === keyHash) ?? null;
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

const VALID_PLAINTEXT = "sk_test123";
const testKey = createApiKey({
  id: "key-1",
  environmentId: "env-1",
  name: "Test",
  keyHash: hashApiKey(VALID_PLAINTEXT),
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
  });

  it("accepts a valid plaintext API key via x-api-key header", async () => {
    const res = await request(buildApp())
      .get("/test")
      .set("x-api-key", VALID_PLAINTEXT);

    expect(res.body.environmentId).toBe("env-1");
  });

  it("rejects API key via query param", async () => {
    const res = await request(buildApp()).get(`/test?apiKey=${VALID_PLAINTEXT}`);

    expect(res.status).toBe(401);
  });

  it("returns 401 for an unknown plaintext", async () => {
    const res = await request(buildApp())
      .get("/test")
      .set("x-api-key", "sk_invalid");

    expect(res.status).toBe(401);
  });

  it("rejects a request that sends the stored keyHash directly", async () => {
    // If an attacker obtained the hash (e.g. from a DB dump) they should
    // not be able to authenticate by sending it as the header value, because
    // the middleware hashes the input before lookup.
    const res = await request(buildApp())
      .get("/test")
      .set("x-api-key", testKey.keyHash);

    expect(res.status).toBe(401);
  });
});
