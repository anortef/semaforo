import type { User } from "../entities/User.js";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(params: { limit: number; offset: number }): Promise<User[]>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
  countAll(): Promise<number>;
}
