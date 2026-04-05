import { describe, it, expect, beforeEach } from "vitest";
import { AdminDeleteUser } from "../../admin/DeleteUser.js";
import { InMemoryUserRepository } from "./InMemoryRepos.js";
import { createUser } from "@semaforo/domain";

describe("AdminDeleteUser", () => {
  let repo: InMemoryUserRepository;
  let useCase: AdminDeleteUser;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
    useCase = new AdminDeleteUser(repo);
    repo.save(createUser({ id: "u1", email: "a@b.com", name: "A", passwordHash: "h" }));
  });

  it("deletes a user", async () => {
    await useCase.execute({ userId: "u1", actingUserId: "admin-1" });

    expect(await repo.findById("u1")).toBeNull();
  });

  it("rejects deleting self", async () => {
    await expect(
      useCase.execute({ userId: "u1", actingUserId: "u1" })
    ).rejects.toThrow("Cannot delete your own account");
  });

  it("rejects non-existent user", async () => {
    await expect(
      useCase.execute({ userId: "nope", actingUserId: "admin-1" })
    ).rejects.toThrow("User not found");
  });
});
