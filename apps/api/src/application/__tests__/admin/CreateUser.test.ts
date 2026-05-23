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

  it("creates a new user", async () => {
    const user = await useCase.execute({
      email: "new@test.com",
      name: "New User",
      password: "password123",
      role: "user",
    });

    expect(user.email).toBe("new@test.com");
  });

  it("never returns the passwordHash field", async () => {
    const user = await useCase.execute({
      email: "leak@test.com",
      name: "Leak",
      password: "password123",
      role: "user",
    });

    expect("passwordHash" in user).toBe(false);
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

  it("hashes the password with bcrypt cost >= 12", async () => {
    await useCase.execute({
      email: "cost@test.com",
      name: "Cost",
      password: "password123",
      role: "user",
    });

    const persisted = await repo.findByEmail("cost@test.com");
    // bcrypt hash format: $2b$<cost>$<salt+hash>
    const match = persisted!.passwordHash.match(/^\$2[aby]\$(\d+)\$/);
    const cost = match ? parseInt(match[1]!, 10) : 0;
    expect(cost).toBeGreaterThanOrEqual(12);
  });
});
