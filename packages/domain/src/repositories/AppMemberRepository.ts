import type { AppMember } from "../entities/AppMember.js";

export interface AppMemberRepository {
  findById(id: string): Promise<AppMember | null>;
  findByAppId(appId: string): Promise<AppMember[]>;
  findByUserId(userId: string): Promise<AppMember[]>;
  findByAppIdAndUserId(appId: string, userId: string): Promise<AppMember | null>;
  save(member: AppMember): Promise<void>;
  delete(id: string): Promise<void>;
}
