import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { createAdminMiddleware } from "../adminMiddleware.js";
import { createUser, type User, type UserRepository } from "@semaforo/domain";

class InMemoryUserRepository implements UserRepository {
  users: User[] = [];
  async findById(id: string) {
    return this.users.find((u) => u.id.value === id) ?? null;
  }
  async findByEmail(email: string) {
    return this.users.find((u) => u.email === email) ?? null;
  }
  async save(user: User) {
    const idx = this.users.findIndex((u) => u.id.value === user.id.value);
    if (idx >= 0) this.users[idx] = user;
    else this.users.push(user);
  }
  async findAll() {
    return [...this.users];
  }
  async countAll() {
    return this.users.length;
  }
  async delete(id: string) {
    this.users = this.users.filter((u) => u.id.value !== id);
  }
}

function buildApp(repo: UserRepository, userId: string | undefined) {
  const app = express();
  app.use((_req, res, next) => {
    res.locals.userId = userId;
    next();
  });
  app.use(createAdminMiddleware(repo));
  app.get("/admin", (_req, res) => {
    res.json({ ok: true, role: res.locals.role });
  });
  return app;
}

describe("adminMiddleware", () => {
  it("allows a user whose current role is admin", async () => {
    const repo = new InMemoryUserRepository();
    await repo.save(
      createUser({ id: "u-1", email: "a@b.com", name: "A", passwordHash: "h", role: "admin" }),
    );

    const res = await request(buildApp(repo, "u-1")).get("/admin");

    expect(res.status).toBe(200);
  });

  it("rejects a user whose current role is `user`", async () => {
    const repo = new InMemoryUserRepository();
    await repo.save(
      createUser({ id: "u-1", email: "a@b.com", name: "A", passwordHash: "h", role: "user" }),
    );

    const res = await request(buildApp(repo, "u-1")).get("/admin");

    expect(res.status).toBe(403);
  });

  it("rejects a freshly-demoted admin even if their JWT still claims admin", async () => {
    // Token was issued while the user was admin. The DB has since been updated
    // to demote them. The middleware must observe the current state, not the
    // stale token claim.
    const repo = new InMemoryUserRepository();
    const stillAdminInToken = createUser({
      id: "u-1",
      email: "a@b.com",
      name: "A",
      passwordHash: "h",
      role: "user", // <- current DB state: demoted
    });
    await repo.save(stillAdminInToken);

    const res = await request(buildApp(repo, "u-1")).get("/admin");

    expect(res.status).toBe(403);
  });

  it("rejects a disabled user even if they are an admin", async () => {
    const repo = new InMemoryUserRepository();
    const u = createUser({
      id: "u-1",
      email: "a@b.com",
      name: "A",
      passwordHash: "h",
      role: "admin",
    });
    Object.assign(u as unknown as Record<string, unknown>, { disabled: true });
    await repo.save(u);

    const res = await request(buildApp(repo, "u-1")).get("/admin");

    expect(res.status).toBe(403);
  });

  it("rejects an unknown userId with 403", async () => {
    const repo = new InMemoryUserRepository();

    const res = await request(buildApp(repo, "nobody")).get("/admin");

    expect(res.status).toBe(403);
  });

  it("rejects when res.locals.userId is missing", async () => {
    const repo = new InMemoryUserRepository();

    const res = await request(buildApp(repo, undefined)).get("/admin");

    expect(res.status).toBe(403);
  });

  it("returns the standard error message for non-admin", async () => {
    const repo = new InMemoryUserRepository();
    await repo.save(
      createUser({ id: "u-1", email: "a@b.com", name: "A", passwordHash: "h", role: "user" }),
    );

    const res = await request(buildApp(repo, "u-1")).get("/admin");

    expect(res.body.error).toBe("Admin access required");
  });
});
