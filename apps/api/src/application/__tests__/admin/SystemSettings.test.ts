import { describe, it, expect, beforeEach } from "vitest";
import { AdminListSystemSettings } from "../../admin/ListSystemSettings.js";
import { AdminUpdateSystemSetting } from "../../admin/UpdateSystemSetting.js";
import { InMemorySystemSettingRepository } from "./InMemoryRepos.js";

describe("AdminListSystemSettings", () => {
  let repo: InMemorySystemSettingRepository;

  beforeEach(() => {
    repo = new InMemorySystemSettingRepository();
  });

  it("returns all settings", async () => {
    const useCase = new AdminListSystemSettings(repo);
    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});

describe("AdminUpdateSystemSetting", () => {
  let repo: InMemorySystemSettingRepository;
  let useCase: AdminUpdateSystemSetting;

  beforeEach(() => {
    repo = new InMemorySystemSettingRepository();
    useCase = new AdminUpdateSystemSetting(repo);
  });

  it("creates a new setting", async () => {
    const setting = await useCase.execute({ key: "publicDomain", value: "https://example.com" });

    expect(setting.value).toBe("https://example.com");
  });

  it("updates an existing setting", async () => {
    await useCase.execute({ key: "publicDomain", value: "https://old.com" });
    const updated = await useCase.execute({ key: "publicDomain", value: "https://new.com" });

    expect(updated.value).toBe("https://new.com");
  });

  it("rejects empty value", async () => {
    await expect(
      useCase.execute({ key: "publicDomain", value: "" })
    ).rejects.toThrow("cannot be empty");
  });
});
