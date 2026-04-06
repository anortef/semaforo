import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  api,
  type AppDTO,
  type EnvironmentDTO,
  type FeatureToggleDTO,
  type ApiKeyDTO,
} from "../api/client.js";

export function TogglesPage() {
  const { appId } = useParams<{ appId: string }>();
  const [app, setApp] = useState<AppDTO | null>(null);
  const [environments, setEnvironments] = useState<EnvironmentDTO[]>([]);
  const [toggles, setToggles] = useState<FeatureToggleDTO[]>([]);
  const [toggleStates, setToggleStates] = useState<
    Map<string, boolean>
  >(new Map());
  const [stringValues, setStringValues] = useState<
    Map<string, string>
  >(new Map());
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [toggleType, setToggleType] = useState<"boolean" | "string">("boolean");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedEnvKey, setSelectedEnvKey] = useState("");
  const [envKeys, setEnvKeys] = useState<Map<string, ApiKeyDTO[]>>(new Map());
  const [updatedAtMap, setUpdatedAtMap] = useState<Map<string, string>>(new Map());

  const loadToggleStates = useCallback(async () => {
    if (!app) return;
    const boolMap = new Map<string, boolean>();
    const strMap = new Map<string, string>();
    for (const env of environments) {
      try {
        const states = await api.toggles.getStates(app.key, env.key);
        for (const [toggleKey, value] of Object.entries(states)) {
          const toggle = toggles.find((t) => t.key === toggleKey);
          if (!toggle) continue;
          const stateKey = `${toggle.id.value}:${env.id.value}`;
          if (typeof value === "string") {
            strMap.set(stateKey, value);
          } else {
            boolMap.set(stateKey, value);
          }
        }
      } catch {
        // ignore
      }
    }
    setToggleStates(boolMap);
    setStringValues(strMap);
  }, [app, environments, toggles]);

  useEffect(() => {
    if (!appId) return;
    api.apps.get(appId).then(setApp).catch(console.error);
    api.environments.list(appId).then(setEnvironments).catch(console.error);
    api.toggles.list(appId).then(setToggles).catch(console.error);
    api.toggles.getValues(appId).then((values) => {
      const map = new Map<string, string>();
      for (const v of values) map.set(`${v.toggleId}:${v.environmentId}`, v.updatedAt);
      setUpdatedAtMap(map);
    }).catch(console.error);
  }, [appId]);

  useEffect(() => {
    for (const env of environments) {
      api.apiKeys.list(env.id.value).then((keys) => {
        setEnvKeys((prev) => new Map(prev).set(env.id.value, keys));
      }).catch(console.error);
    }
  }, [environments]);

  useEffect(() => {
    if (environments.length > 0 && !selectedEnvKey) {
      setSelectedEnvKey(environments[0].key);
    }
  }, [environments, selectedEnvKey]);

  useEffect(() => {
    if (app && environments.length > 0 && toggles.length > 0) {
      loadToggleStates();
    }
  }, [app, environments, toggles, loadToggleStates]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!appId) return;
    setError("");
    try {
      const toggle = await api.toggles.create(appId, { name, key, type: toggleType });
      setToggles((prev) => [...prev, toggle]);
      setName("");
      setKey("");
      setToggleType("boolean");
      setShowForm(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create toggle"
      );
    }
  }

  async function handleToggle(
    toggleId: string,
    envId: string,
    enabled: boolean
  ) {
    setToggleStates((prev) => {
      const next = new Map(prev);
      next.set(`${toggleId}:${envId}`, enabled);
      return next;
    });
    try {
      const result = await api.toggles.setValue(toggleId, envId, { enabled });
      setUpdatedAtMap((prev) => new Map(prev).set(`${toggleId}:${envId}`, result.updatedAt));
    } catch {
      setToggleStates((prev) => {
        const next = new Map(prev);
        next.set(`${toggleId}:${envId}`, !enabled);
        return next;
      });
    }
  }

  async function handleStringChange(toggleId: string, envId: string, stringValue: string) {
    const stateKey = `${toggleId}:${envId}`;
    setStringValues((prev) => new Map(prev).set(stateKey, stringValue));
  }

  async function handleStringSave(toggleId: string, envId: string) {
    const stateKey = `${toggleId}:${envId}`;
    const stringValue = stringValues.get(stateKey) ?? "";
    try {
      const result = await api.toggles.setValue(toggleId, envId, { stringValue });
      setUpdatedAtMap((prev) => new Map(prev).set(stateKey, result.updatedAt));
    } catch {
      // ignore
    }
  }

  const selectedEnv = environments.find((e) => e.key === selectedEnvKey);
  function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const selectedEnvApiKey = selectedEnv
    ? (envKeys.get(selectedEnv.id.value) ?? [])[0]?.key
    : undefined;

  const apiBaseUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}`
    : "";
  const apiEndpoint = app
    ? `/api/public/apps/${app.key}/environments/${selectedEnvKey}/toggles`
    : "";

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Feature Toggles</h1>
          <p className="page-subtitle">
            {app ? `Manage toggles for ${app.name}` : "Loading..."}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Toggle"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-title">Create Toggle</div>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-field" style={{ flex: 1 }}>
                <label>Name</label>
                <input
                  placeholder="New Checkout"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-field" style={{ flex: 1 }}>
                <label>Key (camelCase)</label>
                <input
                  placeholder="newCheckout"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label>Type</label>
                <select
                  value={toggleType}
                  onChange={(e) => setToggleType(e.target.value as "boolean" | "string")}
                  style={{ padding: "0.5rem", background: "var(--color-input-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text)" }}
                >
                  <option value="boolean">Boolean</option>
                  <option value="string">String</option>
                </select>
              </div>
              <button className="btn btn-primary" type="submit">Create</button>
            </div>
            {error && <p className="error-text">{error}</p>}
          </form>
        </div>
      )}

      {app && environments.length > 0 && (
        <div className="card api-info-card">
          <div className="card-title">API Endpoint</div>
          <p className="api-info-desc">
            Use this endpoint to fetch toggle values for your application. The API key determines the environment.
          </p>

          <div className="api-info-env-selector">
            <label>Environment:</label>
            <div className="api-env-tabs">
              {environments.map((env) => (
                <button
                  key={env.id.value}
                  className={`api-env-tab${selectedEnvKey === env.key ? " api-env-tab-active" : ""}`}
                  onClick={() => setSelectedEnvKey(env.key)}
                >
                  {env.name}
                </button>
              ))}
            </div>
          </div>

          <div className="api-info-method">
            <span className="api-method-badge">GET</span>
            <code className="api-url">{apiBaseUrl}/api/public/toggles</code>
          </div>

          <div className="api-info-curl">
            <div className="api-info-curl-label">Simple (recommended)</div>
            <pre className="api-code-block">
              <code>{`curl ${apiBaseUrl}/api/public/toggles \\
  -H "x-api-key: ${selectedEnvApiKey ?? "<your-api-key>"}"`}</code>
            </pre>
          </div>

          <div className="api-info-curl">
            <div className="api-info-curl-label">Full path (alternative)</div>
            <pre className="api-code-block">
              <code>{`curl ${apiBaseUrl}${apiEndpoint} \\
  -H "x-api-key: ${selectedEnvApiKey ?? "<your-api-key>"}"`}</code>
            </pre>
          </div>

          <div className="api-info-curl">
            <div className="api-info-curl-label">Response</div>
            <pre className="api-code-block">
              <code>{`{
${toggles.map((t) => {
  const stateKey = selectedEnv ? `${t.id.value}:${selectedEnv.id.value}` : "";
  const enabled = toggleStates.get(stateKey) ?? false;
  return `  "${t.key}": ${enabled}`;
}).join(",\n")}
}`}</code>
            </pre>
          </div>
        </div>
      )}

      {environments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">&#9729;</div>
            <p>Create environments first before managing toggles.</p>
          </div>
        </div>
      ) : toggles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#9881;</div>
          <p>No toggles yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ paddingLeft: "1.25rem" }}>Toggle</th>
                  {environments.map((env) => (
                    <th key={env.id.value} style={{ textAlign: "center", minWidth: 100 }}>
                      {env.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {toggles.map((toggle) => (
                  <tr key={toggle.id.value}>
                    <td style={{ paddingLeft: "1.25rem" }}>
                      <div style={{ fontWeight: 500 }}>{toggle.name}</div>
                      <span className="badge badge-key">{toggle.key}</span>
                      {toggle.type === "string" && (
                        <span className="badge badge-env" style={{ marginLeft: "0.375rem", fontSize: "0.625rem" }}>string</span>
                      )}
                    </td>
                    {environments.map((env) => {
                      const stateKey = `${toggle.id.value}:${env.id.value}`;
                      const isEnabled = toggleStates.get(stateKey) ?? false;
                      return (
                        <td key={env.id.value} style={{ textAlign: "center", verticalAlign: "middle" }}>
                          {toggle.type === "string" ? (
                            <div style={{ display: "flex", gap: "0.25rem", alignItems: "center", justifyContent: "center" }}>
                              <input
                                style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", background: "var(--color-input-bg)", border: "1px solid var(--color-border)", borderRadius: "4px", color: "var(--color-text)", width: "120px" }}
                                value={stringValues.get(stateKey) ?? ""}
                                onChange={(e) => handleStringChange(toggle.id.value, env.id.value, e.target.value)}
                                onBlur={() => handleStringSave(toggle.id.value, env.id.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleStringSave(toggle.id.value, env.id.value); }}
                              />
                            </div>
                          ) : (
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={(e) =>
                                  handleToggle(
                                    toggle.id.value,
                                    env.id.value,
                                    e.target.checked
                                  )
                                }
                              />
                              <span className="toggle-slider" />
                            </label>
                          )}
                          {updatedAtMap.get(stateKey) && (
                            <div style={{ fontSize: "0.625rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}
                              title={new Date(updatedAtMap.get(stateKey)!).toLocaleString()}>
                              {formatTimeAgo(updatedAtMap.get(stateKey)!)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
