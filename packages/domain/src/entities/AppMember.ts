export interface AppMemberId {
  readonly value: string;
}

export type AppMemberRole = "owner" | "editor" | "viewer";

const VALID_ROLES: ReadonlySet<string> = new Set<AppMemberRole>(["owner", "editor", "viewer"]);

export interface AppMember {
  readonly id: AppMemberId;
  readonly appId: string;
  readonly userId: string;
  readonly role: AppMemberRole;
  readonly createdAt: Date;
}

export function createAppMember(params: {
  id: string;
  appId: string;
  userId: string;
  role?: AppMemberRole;
}): AppMember {
  const role = params.role ?? "viewer";
  if (!VALID_ROLES.has(role)) {
    throw new Error(`Invalid app member role: ${role}`);
  }
  return {
    id: { value: params.id },
    appId: params.appId,
    userId: params.userId,
    role,
    createdAt: new Date(),
  };
}
