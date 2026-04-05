import type { AppMember, AppMemberRepository } from "@semaforo/domain";

export class ListAppMembers {
  constructor(private repository: AppMemberRepository) {}

  async execute(appId: string): Promise<AppMember[]> {
    return this.repository.findByAppId(appId);
  }
}
