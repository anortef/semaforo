const API_BASE = "/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
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

export const api = {
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
