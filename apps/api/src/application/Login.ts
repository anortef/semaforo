import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { UserRepository } from "@semaforo/domain";

// A fixed bcrypt hash we compare against when the user is unknown or disabled.
// Keeps Login.execute timing roughly uniform whether or not the email exists,
// blocking user enumeration via response-latency side channels.
const PLACEHOLDER_HASH =
  "$2b$12$abcdefghijklmnopqrstuvOlT9LDhP4wYZXG.fK3vCKbjAZ5VqxFMa";

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
    const hash = user && !user.disabled ? user.passwordHash : PLACEHOLDER_HASH;
    const passwordMatches = await bcrypt.compare(params.password, hash);

    if (!user || user.disabled || !passwordMatches) {
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      { userId: user.id.value, email: user.email, role: user.role },
      this.jwtSecret,
      { algorithm: "HS256", expiresIn: "24h" }
    );

    return { token };
  }
}
