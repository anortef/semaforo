import { describe, it, expect, beforeEach } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Login } from "../Login.js";
import { createUser, type User, type UserRepository } from "@semaforo/domain";

const JWT_SECRET = "test-secret";

class InMemoryUserRepository implements UserRepository {
  private users: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id.value === id) ?? null;
  }
  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }
  async findAll(params: { limit: number; offset: number }): Promise<User[]> {
    return this.users.slice(params.offset, params.offset + params.limit);
  }
  async save(user: User): Promise<void> {
    const idx = this.users.findIndex((u) => u.id.value === user.id.value);
    if (idx >= 0) this.users[idx] = user;
    else this.users.push(user);
  }
  async delete(id: string): Promise<void> {
    this.users = this.users.filter((u) => u.id.value !== id);
  }
  async countAll(): Promise<number> {
    return this.users.length;
  }
}

describe("Login", () => {
  let repository: InMemoryUserRepository;
  let useCase: Login;

  beforeEach(async () => {
    repository = new InMemoryUserRepository();
    useCase = new Login(repository, JWT_SECRET);

    const hash = await bcrypt.hash("password123", 10);
    const user = createUser({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      passwordHash: hash,
      role: "admin",
    });
    await repository.save(user);
  });

  it("returns a token for valid credentials", async () => {
    const result = await useCase.execute({
      email: "test@example.com",
      password: "password123",
    });

    expect(result.token).toBeDefined();
    const decoded = jwt.verify(result.token, JWT_SECRET) as Record<string, unknown>;
    expect(decoded.userId).toBe("user-1");
    expect(decoded.email).toBe("test@example.com");
    expect(decoded.role).toBe("admin");
  });

  it("rejects unknown email", async () => {
    await expect(
      useCase.execute({ email: "nobody@example.com", password: "password123" })
    ).rejects.toThrow("Invalid credentials");
  });

  it("rejects wrong password", async () => {
    await expect(
      useCase.execute({ email: "test@example.com", password: "wrong" })
    ).rejects.toThrow("Invalid credentials");
  });

  it("rejects a disabled user even with the correct password", async () => {
    const hash = await bcrypt.hash("password123", 10);
    await repository.save(
      createUser({
        id: "user-2",
        email: "disabled@example.com",
        name: "Off",
        passwordHash: hash,
        role: "user",
        // createUser default is disabled: false, so we need to override via the entity directly
      }),
    );
    // Manually disable the user by replacing in-place
    const u = (await repository.findByEmail("disabled@example.com"))!;
    Object.assign(u as unknown as Record<string, unknown>, { disabled: true });

    await expect(
      useCase.execute({ email: "disabled@example.com", password: "password123" }),
    ).rejects.toThrow("Invalid credentials");
  });

  it("runs bcrypt.compare on unknown emails so latency does not leak existence", async () => {
    // The placeholder-hash branch must run a real bcrypt compare. We measure
    // that the unknown-email path takes a similar order of magnitude to the
    // known-email path. Tolerance is generous to keep the test stable.
    const knownStart = Date.now();
    try {
      await useCase.execute({ email: "test@example.com", password: "wrong" });
    } catch {
      /* expected */
    }
    const knownMs = Date.now() - knownStart;

    const unknownStart = Date.now();
    try {
      await useCase.execute({ email: "nobody@example.com", password: "wrong" });
    } catch {
      /* expected */
    }
    const unknownMs = Date.now() - unknownStart;

    // Unknown-email path must spend at least 25% of the time the known path
    // spends, ensuring bcrypt actually ran.
    expect(unknownMs * 4).toBeGreaterThanOrEqual(knownMs);
  });
});
