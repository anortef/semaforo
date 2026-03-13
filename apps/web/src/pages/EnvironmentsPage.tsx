import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type AppDTO, type EnvironmentDTO } from "../api/client.js";

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
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!appId) return;
    api.apps.get(appId).then(setApp).catch(console.error);
    api.environments.list(appId).then(setEnvironments).catch(console.error);
  }, [appId]);

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
          {environments.map((env) => (
            <div key={env.id.value} className="env-card">
              <div className="env-card-name">{env.name}</div>
              <div className="env-card-key">{env.key}</div>

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
