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
}

export interface ToggleValueDTO {
  id: { value: string };
  toggleId: string;
  environmentId: string;
  enabled: boolean;
}

export interface AuthUserDTO {
  userId: string;
  email: string;
  role: string;
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
      data: { name: string; key: string; description?: string }
    ) =>
      request<FeatureToggleDTO>(`/apps/${appId}/toggles`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    setValue: (toggleId: string, environmentId: string, enabled: boolean) =>
      request<ToggleValueDTO>(
        `/toggles/${toggleId}/environments/${environmentId}`,
        {
          method: "PUT",
          body: JSON.stringify({ enabled }),
        }
      ),
  },
};
