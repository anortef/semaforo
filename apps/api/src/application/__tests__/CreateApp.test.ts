import { describe, it, expect, beforeEach } from "vitest";
import { CreateApp } from "../CreateApp.js";
import type { App, AppRepository } from "@semaforo/domain";

class InMemoryAppRepository implements AppRepository {
  private apps: App[] = [];

  async findById(id: string): Promise<App | null> {
    return this.apps.find((a) => a.id.value === id) ?? null;
  }
  async findByKey(key: string): Promise<App | null> {
    return this.apps.find((a) => a.key === key) ?? null;
  }
  async findAll(): Promise<App[]> {
    return [...this.apps];
  }
  async save(app: App): Promise<void> {
    const index = this.apps.findIndex((a) => a.id.value === app.id.value);
    if (index >= 0) {
      this.apps[index] = app;
    } else {
      this.apps.push(app);
    }
  }
  async delete(id: string): Promise<void> {
    this.apps = this.apps.filter((a) => a.id.value !== id);
  }
}

describe("CreateApp", () => {
  let repository: InMemoryAppRepository;
  let useCase: CreateApp;

  beforeEach(() => {
    repository = new InMemoryAppRepository();
    useCase = new CreateApp(repository);
  });

  it("creates a new app", async () => {
    const app = await useCase.execute({
      name: "My App",
      key: "my-app",
      description: "A test app",
    });

    expect(app.name).toBe("My App");
    expect(app.key).toBe("my-app");

    const saved = await repository.findByKey("my-app");
    expect(saved).not.toBeNull();
  });

  it("rejects duplicate key", async () => {
    await useCase.execute({ name: "App 1", key: "my-app" });

    await expect(
      useCase.execute({ name: "App 2", key: "my-app" })
    ).rejects.toThrow("already exists");
  });
});
