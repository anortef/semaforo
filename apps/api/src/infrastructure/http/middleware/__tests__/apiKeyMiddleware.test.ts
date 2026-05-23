import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
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

  it("returns the 'API key required' error when no header is provided", async () => {
    const res = await request(buildApp()).get("/test");

    expect(res.body.error).toBe("API key required");
  });

  it("returns 401 with 'API key required' for an empty x-api-key header", async () => {
    const res = await request(buildApp())
      .get("/test")
      .set("x-api-key", "");

    expect(res.body.error).toBe("API key required");
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

  it("returns the 'API key required' error when the key is in the query string", async () => {
    const res = await request(buildApp()).get(`/test?apiKey=${VALID_PLAINTEXT}`);

    expect(res.body.error).toBe("API key required");
  });

  it("returns 401 for an unknown plaintext", async () => {
    const res = await request(buildApp())
      .get("/test")
      .set("x-api-key", "sk_invalid");

    expect(res.status).toBe(401);
  });

  it("returns the 'Invalid API key' error for an unknown plaintext", async () => {
    const res = await request(buildApp())
      .get("/test")
      .set("x-api-key", "sk_invalid");

    expect(res.body.error).toBe("Invalid API key");
  });

  it("treats a multi-value (array) x-api-key header as missing, not as a candidate token", async () => {
    // Supertest can't send a multi-value header easily, so we drive the
    // middleware directly with a synthetic request whose header is an array
    // (which is what Express produces when the same header appears twice).
    // The middleware must reject this with 'API key required' rather than
    // forwarding the array into the lookup path.
    const repo = new InMemoryApiKeyRepository([testKey]);
    const lookupSpy = vi.spyOn(repo, "findByKeyHash");
    const middleware = createApiKeyMiddleware(repo);

    const req = { headers: { "x-api-key": ["a", "b"] } } as unknown as Request;
    let statusCode: number | null = null;
    let body: unknown = null;
    const res = {
      locals: {} as Record<string, unknown>,
      status(code: number) {
        statusCode = code;
        return res;
      },
      json(payload: unknown) {
        body = payload;
        return res;
      },
    } as unknown as Response;
    const next: NextFunction = vi.fn();

    await middleware(req, res, next);

    expect({ statusCode, body, lookupCalled: lookupSpy.mock.calls.length, nextCalled: (next as ReturnType<typeof vi.fn>).mock.calls.length })
      .toEqual({ statusCode: 401, body: { error: "API key required" }, lookupCalled: 0, nextCalled: 0 });
  });

  it("does not query the repository when no x-api-key header is sent", async () => {
    const repo = new InMemoryApiKeyRepository();
    const spy = vi.spyOn(repo, "findByKeyHash");
    const app = express();
    app.use(createApiKeyMiddleware(repo));
    app.get("/test", (_req, res) => { res.json({ ok: true }); });

    await request(app).get("/test");

    expect(spy).not.toHaveBeenCalled();
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
