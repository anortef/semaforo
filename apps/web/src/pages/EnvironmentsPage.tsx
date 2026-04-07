import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type AppDTO, type EnvironmentDTO, type ApiKeyDTO } from "../api/client.js";

const TTL_PRESETS = [
  { label: "No cache", value: 0 },
  { label: "30s", value: 30 },
  { label: "1 min", value: 60 },
  { label: "5 min", value: 300 },
  { label: "15 min", value: 900 },
  { label: "1 hour", value: 3600 },
];

function formatTtl(seconds: number): string {
  if (seconds === 0) return "No cache";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function EnvironmentsPage() {
  const { appId } = useParams<{ appId: string }>();
  const [app, setApp] = useState<AppDTO | null>(null);
  const [environments, setEnvironments] = useState<EnvironmentDTO[]>([]);
  const [envKeys, setEnvKeys] = useState<Map<string, ApiKeyDTO[]>>(new Map());
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<EnvironmentDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!appId) return;
    api.apps.get(appId).then(setApp).catch(console.error);
    api.environments.list(appId).then(setEnvironments).catch(console.error);
  }, [appId]);

  useEffect(() => {
    for (const env of environments) {
      api.apiKeys.list(env.id.value).then((keys) => {
        setEnvKeys((prev) => new Map(prev).set(env.id.value, keys));
      }).catch(console.error);
    }
  }, [environments]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!appId) return;
    setError("");
    try {
      const env = await api.environments.create(appId, { name, key });
      setEnvironments((prev) => [...prev, env]);
      setName("");
      setKey("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create environment");
    }
  }

  async function handleTtlChange(envId: string, ttl: number) {
    try {
      const updated = await api.environments.update(envId, {
        cacheTtlSeconds: ttl,
      });
      setEnvironments((prev) =>
        prev.map((e) => (e.id.value === envId ? updated : e))
      );
    } catch (err) {
      console.error("Failed to update TTL:", err);
    }
  }

  async function handleClearCache(envId: string) {
    try {
      await api.environments.clearCache(envId);
    } catch (err) {
      console.error("Failed to clear cache:", err);
    }
  }

  async function handleCreateKey(envId: string) {
    try {
      const key = await api.apiKeys.create(envId);
      setEnvKeys((prev) => {
        const next = new Map(prev);
        next.set(envId, [key, ...(prev.get(envId) ?? [])]);
        return next;
      });
    } catch {
      // ignore
    }
  }

  async function handleDeleteKey(envId: string, keyId: string) {
    try {
      await api.apiKeys.delete(keyId);
      setEnvKeys((prev) => {
        const next = new Map(prev);
        next.set(envId, (prev.get(envId) ?? []).filter((k) => k.id.value !== keyId));
        return next;
      });
    } catch {
      // ignore
    }
  }

  async function handleDeleteEnv() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.environments.delete(deleteConfirm.id.value);
      setEnvironments((prev) => prev.filter((e) => e.id.value !== deleteConfirm.id.value));
    } catch { /* ignore */ }
    setDeleting(false);
    setDeleteConfirm(null);
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Environments</h1>
          <p className="page-subtitle">
            {app ? `Deployment environments for ${app.name}` : "Loading..."}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Environment"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-title">Create Environment</div>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-field" style={{ flex: 1 }}>
                <label>Name</label>
                <input
                  placeholder="Production"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-field" style={{ flex: 1 }}>
                <label>Key</label>
                <input
                  placeholder="prod"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  required
                />
              </div>
              <button className="btn btn-primary" type="submit">Create</button>
            </div>
            {error && <p className="error-text">{error}</p>}
          </form>
        </div>
      )}

      {environments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#9729;</div>
          <p>No environments yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="env-grid">
          {environments.map((env) => {
            const keys = envKeys.get(env.id.value) ?? [];
            return (
              <div key={env.id.value} className="env-card" style={{ position: "relative" }}>
                <div className="env-card-name">{env.name}</div>
                <div className="env-card-key">{env.key}</div>
                <button
                  className="btn btn-ghost"
                  style={{ position: "absolute", top: "0.5rem", right: "0.5rem", fontSize: "0.625rem", padding: "0.125rem 0.375rem", color: "var(--color-danger, #dc3545)" }}
                  onClick={() => setDeleteConfirm(env)}
                >
                  Delete
                </button>

                <div className="env-card-ttl">
                  <label className="env-card-ttl-label">Cache TTL</label>
                  <div className="ttl-presets">
                    {TTL_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        className={`ttl-btn${env.cacheTtlSeconds === preset.value ? " ttl-btn-active" : ""}`}
                        onClick={() => handleTtlChange(env.id.value, preset.value)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="env-card-ttl-current">
                    Current: {formatTtl(env.cacheTtlSeconds)}
                  </div>
                  <button
                    className="btn btn-ghost"
                    style={{ marginTop: "0.5rem", width: "100%", fontSize: "0.75rem" }}
                    onClick={() => handleClearCache(env.id.value)}
                  >
                    Clear Cache
                  </button>
                </div>

                <div className="env-card-ttl">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className="env-card-ttl-label" style={{ marginBottom: 0 }}>API Keys</label>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: "0.6875rem", padding: "0.125rem 0.5rem" }}
                      onClick={() => handleCreateKey(env.id.value)}
                    >
                      + New
                    </button>
                  </div>
                  {keys.map((k) => (
                    <div key={k.id.value} style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.375rem", minWidth: 0 }}>
                      <code className="badge badge-key" style={{ fontSize: "0.625rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }}>{k.key}</code>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: "0.625rem", padding: "0.125rem 0.375rem", flexShrink: 0 }}
                        onClick={() => navigator.clipboard.writeText(k.key)}
                        title="Copy to clipboard"
                      >
                        Copy
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ color: "var(--color-red)", fontSize: "0.625rem", padding: "0.125rem 0.375rem", flexShrink: 0 }}
                        onClick={() => handleDeleteKey(env.id.value, k.id.value)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteConfirm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => !deleting && setDeleteConfirm(null)}
        >
          <div className="card" style={{ maxWidth: "420px", width: "90%", margin: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="card-title" style={{ color: "var(--color-danger, #dc3545)" }}>Delete Environment</div>
            <p style={{ fontSize: "0.8125rem", marginBottom: "0.5rem" }}>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong> ({deleteConfirm.key})?
            </p>
            <p style={{ fontSize: "0.8125rem", marginBottom: "1rem", color: "var(--color-danger, #dc3545)", fontWeight: 600 }}>
              This will permanently delete all toggle values, secret values, API keys, and request metrics for this environment.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" disabled={deleting} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ background: "var(--color-danger, #dc3545)", borderColor: "var(--color-danger, #dc3545)" }}
                disabled={deleting}
                onClick={handleDeleteEnv}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
