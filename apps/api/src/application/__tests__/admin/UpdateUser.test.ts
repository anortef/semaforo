import { describe, it, expect, beforeEach } from "vitest";
import { AdminUpdateUser } from "../../admin/UpdateUser.js";
import { InMemoryUserRepository } from "./InMemoryRepos.js";
import { createUser } from "@semaforo/domain";

describe("AdminUpdateUser", () => {
  let repo: InMemoryUserRepository;
  let useCase: AdminUpdateUser;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
    useCase = new AdminUpdateUser(repo);
    repo.save(createUser({ id: "u1", email: "a@b.com", name: "A", passwordHash: "h", role: "user" }));
  });

  it("updates the user name", async () => {
    const updated = await useCase.execute({ userId: "u1", name: "New Name", actingUserId: "admin-1" });

    expect(updated.name).toBe("New Name");
  });

  it("updates the role", async () => {
    const updated = await useCase.execute({ userId: "u1", role: "admin", actingUserId: "admin-1" });

    expect(updated.role).toBe("admin");
  });

  it("disables a user", async () => {
    const updated = await useCase.execute({ userId: "u1", disabled: true, actingUserId: "admin-1" });

    expect(updated.disabled).toBe(true);
  });

  it("rejects changing own role", async () => {
    await expect(
      useCase.execute({ userId: "u1", role: "admin", actingUserId: "u1" })
    ).rejects.toThrow("Cannot change your own role");
  });

  it("rejects non-existent user", async () => {
    await expect(
      useCase.execute({ userId: "nope", name: "X", actingUserId: "admin-1" })
    ).rejects.toThrow("User not found");
  });
});
