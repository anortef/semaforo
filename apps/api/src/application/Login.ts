import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { UserRepository } from "@semaforo/domain";

export class Login {
  constructor(
    private userRepository: UserRepository,
    private jwtSecret: string
  ) {}

  async execute(params: {
    email: string;
    password: string;
  }): Promise<{ token: string }> {
    const user = await this.userRepository.findByEmail(params.email);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const valid = await bcrypt.compare(params.password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      { userId: user.id.value, email: user.email, role: user.role },
      this.jwtSecret,
      { expiresIn: "24h" }
    );

    return { token };
  }
}
