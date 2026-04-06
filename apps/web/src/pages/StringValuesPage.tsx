import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  api,
  type AppDTO,
  type EnvironmentDTO,
  type FeatureToggleDTO,
  type ApiKeyDTO,
} from "../api/client.js";

export function StringValuesPage() {
  const { appId } = useParams<{ appId: string }>();
  const [app, setApp] = useState<AppDTO | null>(null);
  const [environments, setEnvironments] = useState<EnvironmentDTO[]>([]);
  const [toggles, setToggles] = useState<FeatureToggleDTO[]>([]);
  const [stringValues, setStringValues] = useState<Map<string, string>>(new Map());
  const [updatedAtMap, setUpdatedAtMap] = useState<Map<string, string>>(new Map());
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [newValues, setNewValues] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState("");
  const [selectedEnvKey, setSelectedEnvKey] = useState("");
  const [envKeys, setEnvKeys] = useState<Map<string, ApiKeyDTO[]>>(new Map());

  const stringToggles = toggles.filter((t) => t.type === "string");

  useEffect(() => {
    if (!appId) return;
    api.apps.get(appId).then(setApp).catch(console.error);
    api.environments.list(appId).then(setEnvironments).catch(console.error);
    api.toggles.list(appId).then(setToggles).catch(console.error);
    loadValues();
  }, [appId]);

  useEffect(() => {
    for (const env of environments) {
      api.apiKeys.list(env.id.value).then((keys) => {
        setEnvKeys((prev) => new Map(prev).set(env.id.value, keys));
      }).catch(console.error);
    }
    if (environments.length > 0 && !selectedEnvKey) setSelectedEnvKey(environments[0].key);
  }, [environments]);

  async function loadValues() {
    if (!appId) return;
    const values = await api.toggles.getValues(appId);
    const strMap = new Map<string, string>();
    const timeMap = new Map<string, string>();
    for (const v of values) {
      const k = `${v.toggleId}:${v.environmentId}`;
      strMap.set(k, v.stringValue);
      timeMap.set(k, v.updatedAt);
    }
    setStringValues(strMap);
    setUpdatedAtMap(timeMap);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!appId) return;
    setError("");
    try {
      const toggle = await api.toggles.create(appId, { name, key, type: "string" });
      // Set initial values for each environment
      for (const env of environments) {
        const val = newValues.get(env.id.value) ?? "";
        if (val) {
          await api.toggles.setValue(toggle.id.value, env.id.value, { stringValue: val });
        }
      }
      setToggles((prev) => [...prev, toggle]);
      setName(""); setKey(""); setNewValues(new Map()); setShowForm(false);
      await loadValues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    }
  }

  async function handleSave(toggleId: string, envId: string) {
    const stateKey = `${toggleId}:${envId}`;
    const val = stringValues.get(stateKey) ?? "";
    try {
      const result = await api.toggles.setValue(toggleId, envId, { stringValue: val });
      setUpdatedAtMap((prev) => new Map(prev).set(stateKey, result.updatedAt));
    } catch { /* ignore */ }
  }

  function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">String Values</h1>
          <p className="page-subtitle">{app ? `Configurable values for ${app.name}` : "Loading..."}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New String Value"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-title">Create String Value</div>
          <form onSubmit={handleCreate}>
            <div className="form-row" style={{ marginBottom: "1rem" }}>
              <div className="form-field" style={{ flex: 1 }}>
                <label>Name</label>
                <input placeholder="Banner Message" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-field" style={{ flex: 1 }}>
                <label>Key (camelCase)</label>
                <input placeholder="bannerMessage" value={key} onChange={(e) => setKey(e.target.value)} required />
              </div>
            </div>
            <div className="card-title" style={{ fontSize: "0.75rem" }}>Initial values per environment</div>
            {environments.map((env) => (
              <div key={env.id.value} className="form-row" style={{ marginBottom: "0.5rem" }}>
                <div className="form-field" style={{ minWidth: 100 }}>
                  <label>{env.name}</label>
                </div>
                <div className="form-field" style={{ flex: 1 }}>
                  <input
                    placeholder={`Value for ${env.name}...`}
                    value={newValues.get(env.id.value) ?? ""}
                    onChange={(e) => setNewValues((prev) => new Map(prev).set(env.id.value, e.target.value))}
                  />
                </div>
              </div>
            ))}
            <button className="btn btn-primary" type="submit" style={{ marginTop: "0.5rem" }}>Create</button>
            {error && <p className="error-text">{error}</p>}
          </form>
        </div>
      )}

      {app && environments.length > 0 && (() => {
        const selectedEnv = environments.find((e) => e.key === selectedEnvKey);
        const selectedEnvApiKey = selectedEnv ? (envKeys.get(selectedEnv.id.value) ?? [])[0]?.key : undefined;
        const apiBaseUrl = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "";
        return (
          <div className="card api-info-card">
            <div className="card-title">API Endpoint</div>
            <p className="api-info-desc">The API key determines the environment. Returns string values only.</p>
            <div className="api-info-env-selector">
              <label>Environment:</label>
              <div className="api-env-tabs">
                {environments.map((env) => (
                  <button key={env.id.value} className={`api-env-tab${selectedEnvKey === env.key ? " api-env-tab-active" : ""}`} onClick={() => setSelectedEnvKey(env.key)}>{env.name}</button>
                ))}
              </div>
            </div>
            <div className="api-info-method">
              <span className="api-method-badge">GET</span>
              <code className="api-url">{apiBaseUrl}/api/public/values</code>
            </div>
            <div className="api-info-curl">
              <div className="api-info-curl-label">cURL</div>
              <pre className="api-code-block">
                <code>{`curl ${apiBaseUrl}/api/public/values \\
  -H "x-api-key: ${selectedEnvApiKey ?? "<your-api-key>"}"`}</code>
              </pre>
            </div>
          </div>
        );
      })()}

      {environments.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon">&#9729;</div><p>Create environments first.</p></div></div>
      ) : stringToggles.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">&#9998;</div><p>No string values yet. Create one to get started.</p></div>
      ) : (
        stringToggles.map((toggle) => (
          <div key={toggle.id.value} className="card" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{toggle.name}</div>
                <span className="badge badge-key">{toggle.key}</span>
              </div>
            </div>
            {environments.map((env) => {
              const stateKey = `${toggle.id.value}:${env.id.value}`;
              const ts = updatedAtMap.get(stateKey);
              return (
                <div key={env.id.value} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ minWidth: 80, fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>{env.name}</span>
                  <input
                    style={{ flex: 1, padding: "0.375rem 0.625rem", fontSize: "0.8125rem", background: "var(--color-input-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text)" }}
                    value={stringValues.get(stateKey) ?? ""}
                    onChange={(e) => setStringValues((prev) => new Map(prev).set(stateKey, e.target.value))}
                  />
                  <button className="btn btn-ghost" style={{ fontSize: "0.75rem", flexShrink: 0 }} onClick={() => handleSave(toggle.id.value, env.id.value)}>
                    Save
                  </button>
                  {ts && (
                    <span style={{ fontSize: "0.625rem", color: "var(--color-text-muted)", flexShrink: 0 }} title={new Date(ts).toLocaleString()}>
                      {formatTimeAgo(ts)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
