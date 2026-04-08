import type { AppMember, AppMemberRepository } from "@semaforo/domain";
import type { JsonFileStore } from "./JsonFileStore.js";

export class JsonAppMemberRepository implements AppMemberRepository {
  constructor(private store: JsonFileStore<AppMember>) {}

  async findById(id: string) { return this.store.findOne((m) => m.id.value === id); }
  async findByAppId(appId: string) { return this.store.filter((m) => m.appId === appId); }
  async findByUserId(userId: string) { return this.store.filter((m) => m.userId === userId); }
  async findByAppIdAndUserId(appId: string, userId: string) {
    return this.store.findOne((m) => m.appId === appId && m.userId === userId);
  }
  async save(member: AppMember) { await this.store.upsert(member); }
  async delete(id: string) { await this.store.remove((m) => m.id.value === id); }
}
