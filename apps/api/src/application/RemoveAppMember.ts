import type { AppMemberRepository } from "@semaforo/domain";

export class RemoveAppMember {
  constructor(private repository: AppMemberRepository) {}

  async execute(memberId: string): Promise<void> {
    const member = await this.repository.findById(memberId);
    if (!member) {
      throw new Error("App member not found");
    }
    await this.repository.delete(memberId);
  }
}
