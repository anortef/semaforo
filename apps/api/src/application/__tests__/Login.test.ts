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
  async save(user: User): Promise<void> {
    this.users.push(user);
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
});
