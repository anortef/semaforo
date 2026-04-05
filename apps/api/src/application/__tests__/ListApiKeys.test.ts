import { describe, it, expect, beforeEach } from "vitest";
import { ListApiKeys } from "../ListApiKeys.js";
import { createApiKey } from "@semaforo/domain";
import { InMemoryApiKeyRepository } from "./InMemoryRepos.js";

describe("ListApiKeys", () => {
  let repo: InMemoryApiKeyRepository;
  let useCase: ListApiKeys;

  beforeEach(() => {
    repo = new InMemoryApiKeyRepository();
    useCase = new ListApiKeys(repo);
  });

  it("returns existing keys for an environment", async () => {
    repo.save(createApiKey({ id: "k-1", environmentId: "env-1", name: "n", key: "sk_abc" }));
    const keys = await useCase.execute("env-1");

    expect(keys).toHaveLength(1);
  });

  it("auto-creates a key when environment has none", async () => {
    const keys = await useCase.execute("env-1");

    expect(keys).toHaveLength(1);
  });

  it("auto-created key starts with sk_", async () => {
    const keys = await useCase.execute("env-1");

    expect(keys[0].key).toMatch(/^sk_/);
  });

  it("auto-created key is persisted", async () => {
    await useCase.execute("env-1");

    expect(repo.keys).toHaveLength(1);
  });

  it("does not auto-create when keys already exist", async () => {
    repo.save(createApiKey({ id: "k-1", environmentId: "env-1", name: "n", key: "sk_existing" }));
    await useCase.execute("env-1");

    expect(repo.keys).toHaveLength(1);
  });
});
