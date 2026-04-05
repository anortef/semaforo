import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import { createUser, type User, type UserRepository, type UserRole } from "@semaforo/domain";

const SALT_ROUNDS = 10;

export class AdminCreateUser {
  constructor(private userRepository: UserRepository) {}

  async execute(params: {
    email: string;
    name: string;
    password: string;
    role: UserRole;
  }): Promise<User> {
    const existing = await this.userRepository.findByEmail(params.email.toLowerCase());
    if (existing) {
      throw new Error(`User with email "${params.email}" already exists`);
    }

    const passwordHash = await bcrypt.hash(params.password, SALT_ROUNDS);
    const user = createUser({
      id: uuid(),
      email: params.email,
      name: params.name,
      passwordHash,
      role: params.role,
    });

    await this.userRepository.save(user);
    return user;
  }
}
