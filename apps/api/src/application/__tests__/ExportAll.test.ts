import { describe, it, expect, beforeEach } from "vitest";
import { ExportAll } from "../ExportAll.js";
import { ExportApp } from "../ExportApp.js";
import { createApp, createUser, createAppMember, createApiKey, createSystemSetting, createEnvironment } from "@semaforo/domain";
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

describe("ExportAll", () => {
  let useCase: ExportAll;

  beforeEach(() => {
    const appRepo = new InMemoryAppRepository();
    const envRepo = new InMemoryEnvironmentRepository();
    const toggleRepo = new InMemoryFeatureToggleRepository();
    const valueRepo = new InMemoryToggleValueRepository();
    const userRepo = new InMemoryUserRepository();
    const settingRepo = new InMemorySystemSettingRepository();
    const memberRepo = new InMemoryAppMemberRepository();
    const apiKeyRepo = new InMemoryApiKeyRepository();
    const exportApp = new ExportApp(appRepo, envRepo, toggleRepo, valueRepo);
    useCase = new ExportAll(appRepo, exportApp, userRepo, settingRepo, memberRepo, apiKeyRepo, envRepo);

    appRepo.save(createApp({ id: "app-1", name: "Shop", key: "shop" }));
    envRepo.save(createEnvironment({ id: "env-1", appId: "app-1", name: "Prod", key: "prod" }));
    userRepo.save(createUser({ id: "user-0", email: "admin@semaforo.local", name: "Admin", passwordHash: "$2b$seed", role: "admin" }));
    userRepo.save(createUser({ id: "user-1", email: "dev@test.com", name: "Dev", passwordHash: "$2b$hash", role: "user" }));
    settingRepo.save(createSystemSetting({ id: "s-1", key: "publicDomain", value: "https://example.com" }));
    memberRepo.save(createAppMember({ id: "m-1", appId: "app-1", userId: "user-1", role: "owner" }));
    apiKeyRepo.save(createApiKey({ id: "k-1", environmentId: "env-1", name: "key1", key: "sk_abc123" }));
  });

  it("excludes the seed admin user", async () => {
    const result = await useCase.execute();

    expect(result.users).toHaveLength(1);
  });

  it("exports users with password hashes", async () => {
    const result = await useCase.execute();

    expect(result.users[0].passwordHash).toBe("$2b$hash");
  });

  it("exports system settings", async () => {
    const result = await useCase.execute();

    expect(result.settings[0].key).toBe("publicDomain");
  });

  it("exports app members by email", async () => {
    const result = await useCase.execute();

    expect(result.apps[0].members[0].userEmail).toBe("dev@test.com");
  });

  it("exports API keys with original values", async () => {
    const result = await useCase.execute();

    expect(result.apps[0].apiKeys[0].key).toBe("sk_abc123");
  });
});
