import type { UserRepository } from "@semaforo/domain";

export class AdminDeleteUser {
  constructor(private userRepository: UserRepository) {}

  async execute(params: {
    userId: string;
    actingUserId: string;
  }): Promise<void> {
    if (params.userId === params.actingUserId) {
      throw new Error("Cannot delete your own account");
    }

    const user = await this.userRepository.findById(params.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await this.userRepository.delete(params.userId);
  }
}
