import { describe, it, expect, beforeEach } from "vitest";
import { AdminResetUserPassword } from "../../admin/ResetUserPassword.js";
import { InMemoryUserRepository } from "./InMemoryRepos.js";
import { createUser } from "@semaforo/domain";

describe("AdminResetUserPassword", () => {
  let repo: InMemoryUserRepository;
  let useCase: AdminResetUserPassword;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
    useCase = new AdminResetUserPassword(repo);
    repo.save(createUser({ id: "u1", email: "a@b.com", name: "A", passwordHash: "old-hash" }));
  });

  it("updates the password hash", async () => {
    await useCase.execute({ userId: "u1", newPassword: "newpass123" });
    const user = await repo.findById("u1");

    expect(user!.passwordHash).not.toBe("old-hash");
  });

  it("hashes the new password", async () => {
    await useCase.execute({ userId: "u1", newPassword: "newpass123" });
    const user = await repo.findById("u1");

    expect(user!.passwordHash).not.toBe("newpass123");
  });

  it("rejects non-existent user", async () => {
    await expect(
      useCase.execute({ userId: "nope", newPassword: "p" })
    ).rejects.toThrow("User not found");
  });
});
