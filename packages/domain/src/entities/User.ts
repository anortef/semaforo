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
  readonly disabled: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
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
  const now = new Date();
  return {
    id: { value: params.id },
    email: params.email.toLowerCase(),
    name: params.name.trim(),
    passwordHash: params.passwordHash,
    role,
    disabled: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateUser(
  user: User,
  changes: {
    name?: string;
    role?: UserRole;
    disabled?: boolean;
    passwordHash?: string;
  }
): User {
  return {
    ...user,
    name: changes.name ?? user.name,
    role: changes.role ?? user.role,
    disabled: changes.disabled ?? user.disabled,
    passwordHash: changes.passwordHash ?? user.passwordHash,
    updatedAt: new Date(),
  };
}
