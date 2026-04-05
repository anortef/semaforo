import { describe, it, expect, beforeEach } from "vitest";
import { AdminCreateUser } from "../../admin/CreateUser.js";
import { InMemoryUserRepository } from "./InMemoryRepos.js";
import { createUser } from "@semaforo/domain";

describe("AdminCreateUser", () => {
  let repo: InMemoryUserRepository;
  let useCase: AdminCreateUser;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
    useCase = new AdminCreateUser(repo);
  });

  it("creates a new user with hashed password", async () => {
    const user = await useCase.execute({
      email: "new@test.com",
      name: "New User",
      password: "password123",
      role: "user",
    });

    expect(user.passwordHash).not.toBe("password123");
  });

  it("rejects duplicate email", async () => {
    const existing = createUser({ id: "u1", email: "new@test.com", name: "X", passwordHash: "h" });
    await repo.save(existing);

    await expect(
      useCase.execute({ email: "new@test.com", name: "Y", password: "p", role: "user" })
    ).rejects.toThrow("already exists");
  });

  it("assigns the specified role", async () => {
    const user = await useCase.execute({
      email: "admin2@test.com",
      name: "Admin 2",
      password: "p",
      role: "admin",
    });

    expect(user.role).toBe("admin");
  });
});
