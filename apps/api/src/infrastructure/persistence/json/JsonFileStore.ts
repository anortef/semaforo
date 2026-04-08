import fs from "node:fs";
import path from "node:path";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === "string" && ISO_DATE_RE.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return value;
}

export class JsonFileStore<T> {
  private items: T[] = [];
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly getId: (item: T) => string
  ) {}

  async load(): Promise<void> {
    if (fs.existsSync(this.filePath)) {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      this.items = JSON.parse(raw, dateReviver) as T[];
    } else {
      this.items = [];
    }
  }

  getAll(): T[] {
    return [...this.items];
  }

  findOne(predicate: (item: T) => boolean): T | null {
    return this.items.find(predicate) ?? null;
  }

  filter(predicate: (item: T) => boolean): T[] {
    return this.items.filter(predicate);
  }

  count(predicate?: (item: T) => boolean): number {
    return predicate ? this.items.filter(predicate).length : this.items.length;
  }

  async upsert(item: T): Promise<void> {
    const id = this.getId(item);
    const idx = this.items.findIndex((i) => this.getId(i) === id);
    if (idx >= 0) {
      this.items[idx] = item;
    } else {
      this.items.push(item);
    }
    await this.flush();
  }

  async remove(predicate: (item: T) => boolean): Promise<T[]> {
    const removed: T[] = [];
    this.items = this.items.filter((item) => {
      if (predicate(item)) {
        removed.push(item);
        return false;
      }
      return true;
    });
    if (removed.length > 0) await this.flush();
    return removed;
  }

  async clear(): Promise<void> {
    this.items = [];
    await this.flush();
  }

  private flush(): Promise<void> {
    this.writeQueue = this.writeQueue.then(() => this.atomicWrite());
    return this.writeQueue;
  }

  private async atomicWrite(): Promise<void> {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmp = this.filePath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(this.items, null, 2), "utf-8");
    fs.renameSync(tmp, this.filePath);
  }
}
