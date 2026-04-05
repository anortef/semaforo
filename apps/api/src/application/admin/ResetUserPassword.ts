import bcrypt from "bcrypt";
import { updateUser, type UserRepository } from "@semaforo/domain";

const SALT_ROUNDS = 10;

export class AdminResetUserPassword {
  constructor(private userRepository: UserRepository) {}

  async execute(params: {
    userId: string;
    newPassword: string;
  }): Promise<void> {
    const user = await this.userRepository.findById(params.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const passwordHash = await bcrypt.hash(params.newPassword, SALT_ROUNDS);
    const updated = updateUser(user, { passwordHash });
    await this.userRepository.save(updated);
  }
}
