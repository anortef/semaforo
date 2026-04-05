export interface RequestCountId {
  readonly value: string;
}

export interface RequestCount {
  readonly id: RequestCountId;
  readonly environmentId: string;
  readonly count: number;
  readonly windowStart: Date;
  readonly windowEnd: Date;
}

export function createRequestCount(params: {
  id: string;
  environmentId: string;
  count: number;
  windowStart: Date;
  windowEnd: Date;
}): RequestCount {
  if (params.count < 0) {
    throw new Error("Request count cannot be negative");
  }
  return {
    id: { value: params.id },
    environmentId: params.environmentId,
    count: params.count,
    windowStart: params.windowStart,
    windowEnd: params.windowEnd,
  };
}
