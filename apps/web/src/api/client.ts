const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: buildHeaders(),
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export interface AppDTO {
  id: { value: string };
  name: string;
  key: string;
  description: string;
}

export interface EnvironmentDTO {
  id: { value: string };
  appId: string;
  name: string;
  key: string;
  cacheTtlSeconds: number;
}

export interface FeatureToggleDTO {
  id: { value: string };
  appId: string;
  name: string;
  key: string;
  description: string;
  type: "boolean" | "string";
}

export interface ToggleValueDTO {
  id: { value: string };
  toggleId: string;
  environmentId: string;
  enabled: boolean;
  stringValue: string;
  rolloutPercentage: number;
  updatedAt: string;
}

export interface AuthUserDTO {
  userId: string;
  email: string;
  role: string;
}

export interface ApiKeyDTO {
  id: { value: string };
  environmentId: string;
  name: string;
  key: string;
}

export interface AppMemberDTO {
  id: { value: string };
  appId: string;
  userId: string;
  role: string;
  email: string;
  name: string;
}

export interface AdminUserDTO {
  id: { value: string };
  email: string;
  name: string;
  role: string;
  disabled: boolean;
  createdAt: string;
}

export interface SystemSettingDTO {
  id: { value: string };
  key: string;
  value: string;
  updatedAt: string;
}

export interface AuditLogEntryDTO {
  id: { value: string };
  userName: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  details: string;
  createdAt: string;
}

export interface SecretDTO {
  id: { value: string };
  appId: string;
  key: string;
  description: string;
}

export interface MaskedSecretValueDTO {
  secretId: string;
  environmentId: string;
  maskedValue: string;
  updatedAt: string;
}

export interface RevealedSecretValueDTO {
  secretId: string;
  environmentId: string;
  value: string;
}

export interface RequestMetricsDTO {
  current: number;
  last5m: number;
  last1h: number;
  last1d: number;
  last1w: number;
  last1mo: number;
}

export interface EnvironmentMetricsDTO {
  id: string;
  name: string;
  key: string;
  cacheTtlSeconds: number;
  cache: { sizeBytes: number; remainingTtl: number } | null;
  requests: RequestMetricsDTO;
}

export interface AppMetricsDTO {
  toggleCount: number;
  environments: EnvironmentMetricsDTO[];
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    me: (token: string) =>
      fetch(`${API_BASE}/auth/me`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json() as Promise<AuthUserDTO>;
      }),
  },
  apps: {
    list: () => request<AppDTO[]>("/apps"),
    get: (appId: string) => request<AppDTO>(`/apps/${appId}`),
    create: (data: { name: string; key: string; description?: string }) =>
      request<AppDTO>("/apps", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    metrics: (appId: string) =>
      request<AppMetricsDTO>(`/apps/${appId}/metrics`),
    auditLog: (appId: string, limit = 50, offset = 0) =>
      request<{ entries: AuditLogEntryDTO[]; total: number }>(`/apps/${appId}/audit-log?limit=${limit}&offset=${offset}`),
    export: (appId: string) =>
      request<unknown>(`/apps/${appId}/export`),
    import: (data: unknown) =>
      request<{ success: boolean }>("/apps/import", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  environments: {
    list: (appId: string) =>
      request<EnvironmentDTO[]>(`/apps/${appId}/environments`),
    create: (appId: string, data: { name: string; key: string }) =>
      request<EnvironmentDTO>(`/apps/${appId}/environments`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (
      environmentId: string,
      data: { name?: string; cacheTtlSeconds?: number }
    ) =>
      request<EnvironmentDTO>(`/environments/${environmentId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    clearCache: (environmentId: string) =>
      request<{ cleared: boolean }>(`/environments/${environmentId}/cache`, {
        method: "DELETE",
      }),
  },
  toggles: {
    list: (appId: string) =>
      request<FeatureToggleDTO[]>(`/apps/${appId}/toggles`),
    create: (
      appId: string,
      data: { name: string; key: string; description?: string; type?: string }
    ) =>
      request<FeatureToggleDTO>(`/apps/${appId}/toggles`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getStates: (appKey: string, envKey: string) =>
      request<Record<string, boolean>>(
        `/apps/${appKey}/environments/${envKey}/toggle-states`
      ),
    getValues: (appId: string) =>
      request<ToggleValueDTO[]>(`/apps/${appId}/toggle-values`),
    setValue: (toggleId: string, environmentId: string, data: { enabled?: boolean; stringValue?: string; rolloutPercentage?: number }) =>
      request<ToggleValueDTO>(
        `/toggles/${toggleId}/environments/${environmentId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        }
      ),
  },
  members: {
    list: (appId: string) =>
      request<AppMemberDTO[]>(`/apps/${appId}/members`),
    add: (appId: string, userId: string, role: string) =>
      request<AppMemberDTO>(`/apps/${appId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId, role }),
      }),
    remove: (appId: string, memberId: string) =>
      request<void>(`/apps/${appId}/members/${memberId}`, {
        method: "DELETE",
      }),
  },
  apiKeys: {
    list: (environmentId: string) =>
      request<ApiKeyDTO[]>(`/environments/${environmentId}/api-keys`),
    create: (environmentId: string) =>
      request<ApiKeyDTO>(`/environments/${environmentId}/api-keys`, {
        method: "POST",
      }),
    delete: (keyId: string) =>
      request<void>(`/api-keys/${keyId}`, {
        method: "DELETE",
      }),
  },
  secrets: {
    list: (appId: string) =>
      request<SecretDTO[]>(`/apps/${appId}/secrets`),
    create: (appId: string, data: { key: string; description?: string }) =>
      request<SecretDTO>(`/apps/${appId}/secrets`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (secretId: string) =>
      request<void>(`/secrets/${secretId}`, { method: "DELETE" }),
    setValue: (secretId: string, environmentId: string, value: string) =>
      request<{ updated: boolean }>(
        `/secrets/${secretId}/environments/${environmentId}`,
        {
          method: "PUT",
          body: JSON.stringify({ value }),
        }
      ),
    getMasked: (secretId: string, environmentId: string) =>
      request<MaskedSecretValueDTO>(
        `/secrets/${secretId}/environments/${environmentId}`
      ),
    reveal: (secretId: string, environmentId: string) =>
      request<RevealedSecretValueDTO>(
        `/secrets/${secretId}/environments/${environmentId}/reveal`,
        { method: "POST" }
      ),
  },
  admin: {
    users: {
      list: (limit = 50, offset = 0) =>
        request<{ users: AdminUserDTO[]; total: number }>(`/admin/users?limit=${limit}&offset=${offset}`),
      create: (data: { email: string; name: string; password: string; role: string }) =>
        request<AdminUserDTO>("/admin/users", { method: "POST", body: JSON.stringify(data) }),
      update: (userId: string, data: { name?: string; role?: string; disabled?: boolean }) =>
        request<AdminUserDTO>(`/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify(data) }),
      delete: (userId: string) =>
        request<void>(`/admin/users/${userId}`, { method: "DELETE" }),
      resetPassword: (userId: string, newPassword: string) =>
        request<void>(`/admin/users/${userId}/reset-password`, {
          method: "POST",
          body: JSON.stringify({ newPassword }),
        }),
    },
    settings: {
      list: () => request<SystemSettingDTO[]>("/admin/settings"),
      update: (key: string, value: string) =>
        request<SystemSettingDTO>(`/admin/settings/${key}`, {
          method: "PUT",
          body: JSON.stringify({ value }),
        }),
    },
    auditLog: {
      list: (limit = 50, offset = 0) =>
        request<{ entries: AuditLogEntryDTO[]; total: number }>(`/admin/audit-log?limit=${limit}&offset=${offset}`),
    },
    health: () =>
      request<{ database: string; users: number; apps: number; uptime: number; memoryMb: number; loadAvg: [number, number, number] }>("/admin/health"),
    export: () =>
      request<unknown>("/admin/export"),
    import: (data: unknown) =>
      request<{ success: boolean }>("/admin/import", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};
