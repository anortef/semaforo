import { describe, it, expect, beforeEach } from "vitest";
import { AddAppMember } from "../AddAppMember.js";
import { RemoveAppMember } from "../RemoveAppMember.js";
import { ListAppMembers } from "../ListAppMembers.js";
import { createAppMember, type AppMember, type AppMemberRepository } from "@semaforo/domain";

class InMemoryAppMemberRepository implements AppMemberRepository {
  members: AppMember[] = [];

  async findById(id: string): Promise<AppMember | null> {
    return this.members.find((m) => m.id.value === id) ?? null;
  }
  async findByAppId(appId: string): Promise<AppMember[]> {
    return this.members.filter((m) => m.appId === appId);
  }
  async findByUserId(userId: string): Promise<AppMember[]> {
    return this.members.filter((m) => m.userId === userId);
  }
  async findByAppIdAndUserId(appId: string, userId: string): Promise<AppMember | null> {
    return this.members.find((m) => m.appId === appId && m.userId === userId) ?? null;
  }
  async save(member: AppMember): Promise<void> {
    const idx = this.members.findIndex((m) => m.appId === member.appId && m.userId === member.userId);
    if (idx >= 0) this.members[idx] = member;
    else this.members.push(member);
  }
  async delete(id: string): Promise<void> {
    this.members = this.members.filter((m) => m.id.value !== id);
  }
}

describe("AddAppMember", () => {
  let repo: InMemoryAppMemberRepository;
  let useCase: AddAppMember;

  beforeEach(() => {
    repo = new InMemoryAppMemberRepository();
    useCase = new AddAppMember(repo);
  });

  it("adds a member to an app", async () => {
    const member = await useCase.execute({ appId: "app-1", userId: "user-1", role: "editor" });

    expect(member.appId).toBe("app-1");
  });

  it("defaults to viewer role", async () => {
    const member = await useCase.execute({ appId: "app-1", userId: "user-1" });

    expect(member.role).toBe("viewer");
  });

  it("updates role for existing member", async () => {
    await useCase.execute({ appId: "app-1", userId: "user-1", role: "viewer" });
    const updated = await useCase.execute({ appId: "app-1", userId: "user-1", role: "editor" });

    expect(updated.role).toBe("editor");
  });
});

describe("RemoveAppMember", () => {
  let repo: InMemoryAppMemberRepository;
  let useCase: RemoveAppMember;

  beforeEach(() => {
    repo = new InMemoryAppMemberRepository();
    useCase = new RemoveAppMember(repo);
    const member = createAppMember({ id: "m-1", appId: "app-1", userId: "user-1", role: "editor" });
    repo.save(member);
  });

  it("removes a member", async () => {
    await useCase.execute("m-1");

    expect(repo.members).toHaveLength(0);
  });

  it("rejects non-existent member", async () => {
    await expect(useCase.execute("nope")).rejects.toThrow("not found");
  });
});

describe("ListAppMembers", () => {
  let repo: InMemoryAppMemberRepository;
  let useCase: ListAppMembers;

  beforeEach(() => {
    repo = new InMemoryAppMemberRepository();
    useCase = new ListAppMembers(repo);
    repo.save(createAppMember({ id: "m-1", appId: "app-1", userId: "user-1", role: "editor" }));
    repo.save(createAppMember({ id: "m-2", appId: "app-1", userId: "user-2", role: "viewer" }));
  });

  it("returns members for an app", async () => {
    const members = await useCase.execute("app-1");

    expect(members).toHaveLength(2);
  });
});
