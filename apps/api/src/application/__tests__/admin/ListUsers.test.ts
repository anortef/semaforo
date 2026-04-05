import { describe, it, expect, beforeEach } from "vitest";
import { AdminListUsers } from "../../admin/ListUsers.js";
import { InMemoryUserRepository } from "./InMemoryRepos.js";
import { createUser } from "@semaforo/domain";

describe("AdminListUsers", () => {
  let repo: InMemoryUserRepository;
  let useCase: AdminListUsers;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
    useCase = new AdminListUsers(repo);
    repo.save(createUser({ id: "u1", email: "a@b.com", name: "A", passwordHash: "h" }));
    repo.save(createUser({ id: "u2", email: "b@b.com", name: "B", passwordHash: "h" }));
  });

  it("returns paginated users", async () => {
    const result = await useCase.execute({ limit: 10, offset: 0 });

    expect(result.users).toHaveLength(2);
  });

  it("respects pagination offset", async () => {
    const result = await useCase.execute({ limit: 1, offset: 1 });

    expect(result.users).toHaveLength(1);
  });
});
