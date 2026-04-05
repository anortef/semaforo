import { describe, it, expect, beforeEach } from "vitest";
import { DeleteApiKey } from "../DeleteApiKey.js";
import { createApiKey } from "@semaforo/domain";
import { InMemoryApiKeyRepository } from "./InMemoryRepos.js";

describe("DeleteApiKey", () => {
  let repo: InMemoryApiKeyRepository;
  let useCase: DeleteApiKey;

  beforeEach(() => {
    repo = new InMemoryApiKeyRepository();
    useCase = new DeleteApiKey(repo);
    repo.save(createApiKey({ id: "k-1", environmentId: "env-1", name: "n", key: "sk_abc" }));
  });

  it("deletes an existing key", async () => {
    await useCase.execute("k-1");

    expect(repo.keys).toHaveLength(0);
  });

  it("throws for non-existent key", async () => {
    await expect(useCase.execute("nope")).rejects.toThrow("not found");
  });
});
