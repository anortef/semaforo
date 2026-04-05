import { describe, it, expect, beforeEach } from "vitest";
import { SeedDefaultUser } from "../SeedDefaultUser.js";
import type { User, UserRepository } from "@semaforo/domain";

class InMemoryUserRepository implements UserRepository {
  private users: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id.value === id) ?? null;
  }
  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }
  async save(user: User): Promise<void> {
    const index = this.users.findIndex((u) => u.id.value === user.id.value);
    if (index >= 0) {
      this.users[index] = user;
    } else {
      this.users.push(user);
    }
  }
  async countAll(): Promise<number> {
    return this.users.length;
  }
}

describe("SeedDefaultUser", () => {
  let repository: InMemoryUserRepository;
  let useCase: SeedDefaultUser;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    useCase = new SeedDefaultUser(repository);
  });

  it("creates admin user when no users exist", async () => {
    await useCase.execute();

    const admin = await repository.findByEmail("admin@semaforo.local");
    expect(admin).not.toBeNull();
    expect(admin!.name).toBe("Admin");
    expect(admin!.role).toBe("admin");
  });

  it("does not create admin when users already exist", async () => {
    await useCase.execute();
    const firstAdmin = await repository.findByEmail("admin@semaforo.local");

    await useCase.execute();
    const count = await repository.countAll();

    expect(count).toBe(1);
    expect(firstAdmin).not.toBeNull();
  });

  it("hashes the default password", async () => {
    await useCase.execute();

    const admin = await repository.findByEmail("admin@semaforo.local");
    expect(admin!.passwordHash).not.toBe("admin");
    expect(admin!.passwordHash.length).toBeGreaterThan(10);
  });
});
