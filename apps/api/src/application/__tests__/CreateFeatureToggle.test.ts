import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import { CreateFeatureToggle } from "../CreateFeatureToggle.js";
import { createApp } from "@semaforo/domain";
import { InMemoryAppRepository, InMemoryFeatureToggleRepository } from "./InMemoryRepos.js";

const TOGGLE_KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9]*$/;

const camelCaseKey = (): fc.Arbitrary<string> =>
  fc
    .tuple(
      fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")),
      fc.array(
        fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")),
        { maxLength: 20 },
      ),
    )
    .map(([first, rest]) => first + rest.join(""));

const invalidCamelCaseKey = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.constant(""),
    fc.constant("1"),
    camelCaseKey().map((k) => "1" + k),
    camelCaseKey().map((k) => "-" + k),
    camelCaseKey().map((k) => k + "-"),
    camelCaseKey().map((k) => k + " "),
  );

describe("CreateFeatureToggle", () => {
  let appRepo: InMemoryAppRepository;
  let toggleRepo: InMemoryFeatureToggleRepository;
  let useCase: CreateFeatureToggle;

  beforeEach(() => {
    appRepo = new InMemoryAppRepository();
    toggleRepo = new InMemoryFeatureToggleRepository();
    useCase = new CreateFeatureToggle(appRepo, toggleRepo);
    appRepo.save(createApp({ id: "app-1", name: "Shop", key: "shop" }));
  });

  it("creates a toggle for an existing app", async () => {
    const toggle = await useCase.execute({ appId: "app-1", name: "New Checkout", key: "newCheckout" });

    expect(toggle.key).toBe("newCheckout");
  });

  it("rejects non-existent app", async () => {
    await expect(
      useCase.execute({ appId: "nope", name: "Test", key: "test" })
    ).rejects.toThrow("App not found");
  });

  it("rejects duplicate key within same app", async () => {
    await useCase.execute({ appId: "app-1", name: "A", key: "newCheckout" });

    await expect(
      useCase.execute({ appId: "app-1", name: "B", key: "newCheckout" })
    ).rejects.toThrow("already exists");
  });

  it("stores optional description", async () => {
    const toggle = await useCase.execute({
      appId: "app-1", name: "A", key: "featureA", description: "my desc",
    });

    expect(toggle.description).toBe("my desc");
  });
});

describe("CreateFeatureToggle properties", () => {
  const freshSetup = () => {
    const appRepo = new InMemoryAppRepository();
    const toggleRepo = new InMemoryFeatureToggleRepository();
    const useCase = new CreateFeatureToggle(appRepo, toggleRepo);
    appRepo.save(createApp({ id: "app-1", name: "Shop", key: "shop" }));
    return { appRepo, toggleRepo, useCase };
  };

  it("accepts any key matching the camelCase pattern", () => {
    return fc.assert(
      fc.asyncProperty(camelCaseKey(), async (key) => {
        const { useCase } = freshSetup();
        const result = await useCase.execute({ appId: "app-1", name: "X", key });
        return result.key === key && TOGGLE_KEY_REGEX.test(result.key);
      }),
    );
  });

  it("rejects any key that does not match the camelCase pattern", () => {
    return fc.assert(
      fc.asyncProperty(invalidCamelCaseKey(), async (key) => {
        const { useCase } = freshSetup();
        let threw = false;
        try {
          await useCase.execute({ appId: "app-1", name: "X", key });
        } catch {
          threw = true;
        }
        return threw;
      }),
    );
  });

  it("uniqueness: second create with the same (appId, key) always throws", () => {
    return fc.assert(
      fc.asyncProperty(camelCaseKey(), async (key) => {
        const { useCase } = freshSetup();
        await useCase.execute({ appId: "app-1", name: "First", key });
        let threw = false;
        try {
          await useCase.execute({ appId: "app-1", name: "Second", key });
        } catch {
          threw = true;
        }
        return threw;
      }),
      { numRuns: 30 },
    );
  });

  it("creates exactly one repo record per unique key", () => {
    return fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(camelCaseKey(), { minLength: 1, maxLength: 10 }),
        async (keys) => {
          const { toggleRepo, useCase } = freshSetup();
          for (const key of keys) {
            await useCase.execute({ appId: "app-1", name: "X", key });
          }
          return toggleRepo.toggles.length === keys.length;
        },
      ),
    );
  });
});
