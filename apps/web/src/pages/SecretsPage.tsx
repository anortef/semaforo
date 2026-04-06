import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  api,
  type AppDTO,
  type EnvironmentDTO,
  type SecretDTO,
  type MaskedSecretValueDTO,
  type ApiKeyDTO,
} from "../api/client.js";

export function SecretsPage() {
  const { appId } = useParams<{ appId: string }>();
  const [app, setApp] = useState<AppDTO | null>(null);
  const [environments, setEnvironments] = useState<EnvironmentDTO[]>([]);
  const [secrets, setSecrets] = useState<SecretDTO[]>([]);
  const [maskedValues, setMaskedValues] = useState<Map<string, MaskedSecretValueDTO>>(new Map());
  const [revealedValues, setRevealedValues] = useState<Map<string, string>>(new Map());
  const [inputValues, setInputValues] = useState<Map<string, string>>(new Map());
  const [showForm, setShowForm] = useState(false);
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [selectedEnvKey, setSelectedEnvKey] = useState("");
  const [envKeys, setEnvKeys] = useState<Map<string, ApiKeyDTO[]>>(new Map());

  useEffect(() => {
    if (!appId) return;
    api.apps.get(appId).then(setApp).catch(console.error);
    api.environments.list(appId).then(setEnvironments).catch(console.error);
    api.secrets.list(appId).then(setSecrets).catch(console.error);
  }, [appId]);

  useEffect(() => {
    for (const env of environments) {
      api.apiKeys.list(env.id.value).then((keys) => {
        setEnvKeys((prev) => new Map(prev).set(env.id.value, keys));
      }).catch(console.error);
    }
    if (environments.length > 0 && !selectedEnvKey) setSelectedEnvKey(environments[0].key);
  }, [environments]);

  useEffect(() => {
    if (secrets.length === 0 || environments.length === 0) return;
    loadMaskedValues();
  }, [secrets, environments]);

  async function loadMaskedValues() {
    const newMap = new Map<string, MaskedSecretValueDTO>();
    for (const secret of secrets) {
      for (const env of environments) {
        try {
          const masked = await api.secrets.getMasked(secret.id.value, env.id.value);
          newMap.set(`${secret.id.value}:${env.id.value}`, masked);
        } catch {
          // No value set yet
        }
      }
    }
    setMaskedValues(newMap);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!appId) return;
    setError("");
    try {
      const secret = await api.secrets.create(appId, { key, description });
      setSecrets((prev) => [...prev, secret]);
      setKey("");
      setDescription("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    }
  }

  async function handleSave(secretId: string, envId: string) {
    const stateKey = `${secretId}:${envId}`;
    const val = inputValues.get(stateKey);
    if (val === undefined || val === "") return;
    try {
      await api.secrets.setValue(secretId, envId, val);
      setInputValues((prev) => {
        const next = new Map(prev);
        next.delete(stateKey);
        return next;
      });
      // Refresh masked value
      try {
        const masked = await api.secrets.getMasked(secretId, envId);
        setMaskedValues((prev) => new Map(prev).set(stateKey, masked));
      } catch { /* ignore */ }
      // Clear revealed value
      setRevealedValues((prev) => {
        const next = new Map(prev);
        next.delete(stateKey);
        return next;
      });
    } catch { /* ignore */ }
  }

  async function handleReveal(secretId: string, envId: string) {
    const stateKey = `${secretId}:${envId}`;
    if (revealedValues.has(stateKey)) {
      // Hide it
      setRevealedValues((prev) => {
        const next = new Map(prev);
        next.delete(stateKey);
        return next;
      });
      return;
    }
    try {
      const result = await api.secrets.reveal(secretId, envId);
      setRevealedValues((prev) => new Map(prev).set(stateKey, result.value));
    } catch { /* ignore */ }
  }

  async function handleDelete(secretId: string) {
    try {
      await api.secrets.delete(secretId);
      setSecrets((prev) => prev.filter((s) => s.id.value !== secretId));
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
          <h1 className="page-title">Secrets</h1>
          <p className="page-subtitle">{app ? `Encrypted secrets for ${app.name}` : "Loading..."}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Secret"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-title">Create Secret</div>
          <form onSubmit={handleCreate}>
            <div className="form-row" style={{ marginBottom: "1rem" }}>
              <div className="form-field" style={{ flex: 1 }}>
                <label>Key (camelCase)</label>
                <input placeholder="databasePassword" value={key} onChange={(e) => setKey(e.target.value)} required />
              </div>
              <div className="form-field" style={{ flex: 1 }}>
                <label>Description</label>
                <input placeholder="Main database password" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
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
            <p className="api-info-desc">Fetch decrypted secrets for an environment. Secrets are returned as key-value pairs.</p>
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
              <code className="api-url">{apiBaseUrl}/api/public/apps/{app.key}/environments/{selectedEnvKey}/secrets</code>
            </div>
            <div className="api-info-curl">
              <div className="api-info-curl-label">cURL</div>
              <pre className="api-code-block">
                <code>{`curl ${apiBaseUrl}/api/public/apps/${app.key}/environments/${selectedEnvKey}/secrets \\
  -H "x-api-key: ${selectedEnvApiKey ?? "<your-api-key>"}"`}</code>
              </pre>
            </div>
          </div>
        );
      })()}

      {environments.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon">&#9729;</div><p>Create environments first.</p></div></div>
      ) : secrets.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">&#128274;</div><p>No secrets yet. Create one to get started.</p></div>
      ) : (
        secrets.map((secret) => (
          <div key={secret.id.value} className="card" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div>
                <span className="badge badge-key">{secret.key}</span>
                {secret.description && (
                  <span style={{ marginLeft: "0.5rem", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>{secret.description}</span>
                )}
              </div>
              <button className="btn btn-ghost" style={{ fontSize: "0.75rem", color: "var(--color-danger, #e53e3e)" }} onClick={() => handleDelete(secret.id.value)}>
                Delete
              </button>
            </div>
            {environments.map((env) => {
              const stateKey = `${secret.id.value}:${env.id.value}`;
              const masked = maskedValues.get(stateKey);
              const revealed = revealedValues.get(stateKey);
              return (
                <div key={env.id.value} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ minWidth: 80, fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>{env.name}</span>
                  {masked && (
                    <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--color-text-muted)", minWidth: 90 }}>
                      {revealed ?? masked.maskedValue}
                    </span>
                  )}
                  {masked && (
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: "0.625rem", flexShrink: 0 }}
                      onClick={() => handleReveal(secret.id.value, env.id.value)}
                    >
                      {revealed ? "Hide" : "Reveal"}
                    </button>
                  )}
                  <input
                    type="password"
                    style={{ flex: 1, padding: "0.375rem 0.625rem", fontSize: "0.8125rem", background: "var(--color-input-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text)" }}
                    placeholder="New value..."
                    value={inputValues.get(stateKey) ?? ""}
                    onChange={(e) => setInputValues((prev) => new Map(prev).set(stateKey, e.target.value))}
                  />
                  <button className="btn btn-ghost" style={{ fontSize: "0.75rem", flexShrink: 0 }} onClick={() => handleSave(secret.id.value, env.id.value)}>
                    Save
                  </button>
                  {masked && (
                    <span style={{ fontSize: "0.625rem", color: "var(--color-text-muted)", flexShrink: 0 }} title={new Date(masked.updatedAt).toLocaleString()}>
                      {formatTimeAgo(masked.updatedAt)}
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
