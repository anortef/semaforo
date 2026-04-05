export interface UserId {
  readonly value: string;
}

export type UserRole = "admin" | "user";

const VALID_ROLES: ReadonlySet<string> = new Set<UserRole>(["admin", "user"]);

export interface User {
  readonly id: UserId;
  readonly email: string;
  readonly name: string;
  readonly passwordHash: string;
  readonly role: UserRole;
  readonly createdAt: Date;
}

export function createUser(params: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role?: UserRole;
}): User {
  if (!params.email.includes("@")) {
    throw new Error("Invalid email address");
  }
  if (params.name.trim().length === 0) {
    throw new Error("Name cannot be empty");
  }
  const role = params.role ?? "user";
  if (!VALID_ROLES.has(role)) {
    throw new Error(`Invalid role: ${role}`);
  }
  return {
    id: { value: params.id },
    email: params.email.toLowerCase(),
    name: params.name.trim(),
    passwordHash: params.passwordHash,
    role,
    createdAt: new Date(),
  };
}
