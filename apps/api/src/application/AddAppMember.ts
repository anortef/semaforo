import { v4 as uuid } from "uuid";
import { createAppMember, type AppMember, type AppMemberRepository, type AppMemberRole } from "@semaforo/domain";

export class AddAppMember {
  constructor(private repository: AppMemberRepository) {}

  async execute(params: {
    appId: string;
    userId: string;
    role?: AppMemberRole;
  }): Promise<AppMember> {
    const member = createAppMember({
      id: uuid(),
      appId: params.appId,
      userId: params.userId,
      role: params.role,
    });

    await this.repository.save(member);
    return member;
  }
}
