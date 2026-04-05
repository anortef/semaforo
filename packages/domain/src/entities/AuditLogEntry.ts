export interface AuditLogEntryId {
  readonly value: string;
}

export interface AuditLogEntry {
  readonly id: AuditLogEntryId;
  readonly userId: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly details: string;
  readonly createdAt: Date;
}

export function createAuditLogEntry(params: {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: string;
}): AuditLogEntry {
  if (params.action.trim().length === 0) {
    throw new Error("Audit action cannot be empty");
  }
  return {
    id: { value: params.id },
    userId: params.userId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    details: params.details ?? "{}",
    createdAt: new Date(),
  };
}
