import type { User, UserRepository } from "@semaforo/domain";

export class AdminListUsers {
  constructor(private userRepository: UserRepository) {}

  async execute(params: {
    limit: number;
    offset: number;
  }): Promise<{ users: User[]; total: number }> {
    const [users, total] = await Promise.all([
      this.userRepository.findAll(params),
      this.userRepository.countAll(),
    ]);
    return { users, total };
  }
}
