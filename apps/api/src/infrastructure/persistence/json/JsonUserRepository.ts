import type { User, UserRepository } from "@semaforo/domain";
import type { JsonFileStore } from "./JsonFileStore.js";

export class JsonUserRepository implements UserRepository {
  constructor(private store: JsonFileStore<User>) {}

  async findById(id: string) { return this.store.findOne((u) => u.id.value === id); }
  async findByEmail(email: string) {
    return this.store.findOne((u) => u.email.toLowerCase() === email.toLowerCase());
  }
  async findAll(params: { limit: number; offset: number }) {
    const all = this.store.getAll().sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return all.slice(params.offset, params.offset + params.limit);
  }
  async save(user: User) { await this.store.upsert(user); }
  async delete(id: string) { await this.store.remove((u) => u.id.value === id); }
  async countAll() { return this.store.count(); }
}
