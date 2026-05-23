import type { UserRepository } from "@semaforo/domain";
import { toSafeUser, type SafeUser } from "./SafeUser.js";

export class AdminListUsers {
  constructor(private userRepository: UserRepository) {}

  async execute(params: {
    limit: number;
    offset: number;
  }): Promise<{ users: SafeUser[]; total: number }> {
    const [users, total] = await Promise.all([
      this.userRepository.findAll(params),
      this.userRepository.countAll(),
    ]);
    return { users: users.map(toSafeUser), total };
  }
}
