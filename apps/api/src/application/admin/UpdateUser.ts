import { updateUser, type User, type UserRepository, type UserRole } from "@semaforo/domain";

export class AdminUpdateUser {
  constructor(private userRepository: UserRepository) {}

  async execute(params: {
    userId: string;
    actingUserId: string;
    name?: string;
    role?: UserRole;
    disabled?: boolean;
  }): Promise<User> {
    if (params.role && params.userId === params.actingUserId) {
      throw new Error("Cannot change your own role");
    }

    const user = await this.userRepository.findById(params.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updated = updateUser(user, {
      name: params.name,
      role: params.role,
      disabled: params.disabled,
    });

    await this.userRepository.save(updated);
    return updated;
  }
}
