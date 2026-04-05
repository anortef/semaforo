import { describe, it, expect, beforeEach } from "vitest";
import { FlushRequestCounts } from "../FlushRequestCounts.js";
import type { RequestCount, RequestCountRepository } from "@semaforo/domain";
import type { RequestCounter } from "../../infrastructure/cache/RedisToggleCache.js";

class InMemoryRequestCountRepository implements RequestCountRepository {
  entries: RequestCount[] = [];
  async save(entry: RequestCount) { this.entries.push(entry); }
  async sumByEnvironmentIdSince() { return 0; }
  async sumByEnvironmentIds() { return new Map(); }
}

class StubRequestCounter implements RequestCounter {
  private counts = new Map<string, number>();

  setCount(envId: string, count: number) {
    this.counts.set(`requests:${envId}`, count);
  }

  async increment() {}
  async getAndReset(environmentId: string) {
    const key = `requests:${environmentId}`;
    const val = this.counts.get(key) ?? 0;
    this.counts.delete(key);
    return val;
  }
  async getAllEnvironmentIds() {
    return [...this.counts.keys()].map((k) => k.replace("requests:", ""));
  }
  async getCurrentCount() { return 0; }
}

describe("FlushRequestCounts", () => {
  let repo: InMemoryRequestCountRepository;
  let counter: StubRequestCounter;
  let useCase: FlushRequestCounts;

  beforeEach(() => {
    repo = new InMemoryRequestCountRepository();
    counter = new StubRequestCounter();
    useCase = new FlushRequestCounts(repo, counter);
  });

  it("persists counts from Redis to database", async () => {
    counter.setCount("env-1", 42);
    await useCase.execute();

    expect(repo.entries).toHaveLength(1);
  });

  it("saves the correct count value", async () => {
    counter.setCount("env-1", 42);
    await useCase.execute();

    expect(repo.entries[0].count).toBe(42);
  });

  it("skips environments with zero requests", async () => {
    counter.setCount("env-1", 0);
    await useCase.execute();

    expect(repo.entries).toHaveLength(0);
  });

  it("flushes multiple environments", async () => {
    counter.setCount("env-1", 10);
    counter.setCount("env-2", 20);
    await useCase.execute();

    expect(repo.entries).toHaveLength(2);
  });

  it("resets Redis counter after flush", async () => {
    counter.setCount("env-1", 42);
    await useCase.execute();
    const remaining = await counter.getAndReset("env-1");

    expect(remaining).toBe(0);
  });
});
