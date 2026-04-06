import { describe, it, expect, beforeEach } from "vitest";
import { ImportAll, type FullExport } from "../ImportAll.js";
import { ImportApp } from "../ImportApp.js";
import {
  InMemoryAppRepository,
  InMemoryEnvironmentRepository,
  InMemoryFeatureToggleRepository,
  InMemoryToggleValueRepository,
  InMemoryApiKeyRepository,
} from "./InMemoryRepos.js";
import { InMemoryUserRepository, InMemorySystemSettingRepository } from "./admin/InMemoryRepos.js";
import type { AppMember, AppMemberRepository } from "@semaforo/domain";

class InMemoryAppMemberRepository implements AppMemberRepository {
  members: AppMember[] = [];
  async findById(id: string) { return this.members.find((m) => m.id.value === id) ?? null; }
  async findByAppId(appId: string) { return this.members.filter((m) => m.appId === appId); }
  async findByUserId(userId: string) { return this.members.filter((m) => m.userId === userId); }
  async findByAppIdAndUserId(appId: string, userId: string) { return this.members.find((m) => m.appId === appId && m.userId === userId) ?? null; }
  async save(m: AppMember) { this.members.push(m); }
  async delete(id: string) { this.members = this.members.filter((m) => m.id.value !== id); }
}

const sampleExport: FullExport = {
  users: [
    { email: "admin@test.com", name: "Admin", passwordHash: "$2b$hash", role: "admin", disabled: false },
    { email: "user@test.com", name: "User", passwordHash: "$2b$hash2", role: "user", disabled: false },
  ],
  settings: [
    { key: "publicDomain", value: "https://example.com" },
  ],
  apps: [
    {
      app: { name: "Shop", key: "shop", description: "My shop" },
      environments: [{ name: "Prod", key: "prod", cacheTtlSeconds: 300 }],
      toggles: [{ name: "Checkout", key: "checkout", description: "", values: { prod: true } }],
      members: [{ userEmail: "admin@test.com", role: "owner" }],
      apiKeys: [{ environmentKey: "prod", key: "sk_restored123", name: "key1" }],
    },
  ],
  exportedAt: "2026-04-06T00:00:00Z",
};

describe("ImportAll", () => {
  let userRepo: InMemoryUserRepository;
  let settingRepo: InMemorySystemSettingRepository;
  let memberRepo: InMemoryAppMemberRepository;
  let apiKeyRepo: InMemoryApiKeyRepository;
  let appRepo: InMemoryAppRepository;
  let useCase: ImportAll;

  beforeEach(() => {
    appRepo = new InMemoryAppRepository();
    const envRepo = new InMemoryEnvironmentRepository();
    const toggleRepo = new InMemoryFeatureToggleRepository();
    const valueRepo = new InMemoryToggleValueRepository();
    userRepo = new InMemoryUserRepository();
    settingRepo = new InMemorySystemSettingRepository();
    memberRepo = new InMemoryAppMemberRepository();
    apiKeyRepo = new InMemoryApiKeyRepository();
    const importApp = new ImportApp(appRepo, envRepo, toggleRepo, valueRepo);
    useCase = new ImportAll(importApp, userRepo, settingRepo, memberRepo, apiKeyRepo, appRepo, envRepo);
  });

  it("restores users", async () => {
    await useCase.execute(sampleExport);

    expect(userRepo.users).toHaveLength(2);
  });

  it("restores users with password hashes intact", async () => {
    await useCase.execute(sampleExport);

    expect(userRepo.users[0].passwordHash).toBe("$2b$hash");
  });

  it("restores system settings", async () => {
    await useCase.execute(sampleExport);

    expect(settingRepo.settings).toHaveLength(1);
  });

  it("restores app members linked by email", async () => {
    await useCase.execute(sampleExport);

    expect(memberRepo.members).toHaveLength(1);
  });

  it("restores API keys with original key values", async () => {
    await useCase.execute(sampleExport);

    expect(apiKeyRepo.keys[0].key).toBe("sk_restored123");
  });

  it("restores apps", async () => {
    await useCase.execute(sampleExport);

    expect(appRepo.apps).toHaveLength(1);
  });
});
