import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type AppDTO, type EnvironmentDTO } from "../api/client.js";

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
