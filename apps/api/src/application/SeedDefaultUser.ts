import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import { createUser, type UserRepository } from "@semaforo/domain";

const SALT_ROUNDS = 10;

export class SeedDefaultUser {
  constructor(private userRepository: UserRepository) {}

  async execute(): Promise<void> {
    const count = await this.userRepository.countAll();
    if (count > 0) {
      return;
    }

    const passwordHash = await bcrypt.hash("admin", SALT_ROUNDS);
    const admin = createUser({
      id: uuid(),
      email: "admin@semaforo.local",
      name: "Admin",
      passwordHash,
      role: "admin",
    });

    await this.userRepository.save(admin);
  }
}
