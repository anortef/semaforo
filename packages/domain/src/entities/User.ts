export interface UserId {
  readonly value: string;
}

export interface User {
  readonly id: UserId;
  readonly email: string;
  readonly name: string;
  readonly passwordHash: string;
  readonly createdAt: Date;
}

export function createUser(params: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}): User {
  if (!params.email.includes("@")) {
    throw new Error("Invalid email address");
  }
  if (params.name.trim().length === 0) {
    throw new Error("Name cannot be empty");
  }
  return {
    id: { value: params.id },
    email: params.email.toLowerCase(),
    name: params.name.trim(),
    passwordHash: params.passwordHash,
    createdAt: new Date(),
  };
}
