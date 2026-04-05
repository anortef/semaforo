import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useApps } from "../context/AppsContext.js";

export function AppsPage() {
  const { apps, refresh } = useApps();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.apps.create({ name, key });
      await refresh();
      setName("");
      setKey("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create app");
    }
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="page-subtitle">Manage your applications and their feature toggles</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New App"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-title">Create Application</div>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-field" style={{ flex: 1 }}>
                <label>Name</label>
                <input
                  placeholder="My Application"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-field" style={{ flex: 1 }}>
                <label>Key</label>
                <input
                  placeholder="my-application"
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

      {apps.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#9881;</div>
          <p>No applications yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="app-grid">
          {apps.map((app) => (
            <Link
              key={app.id.value}
              to={`/apps/${app.id.value}/toggles`}
              className="app-card"
            >
              <div className="app-card-name">{app.name}</div>
              <div className="app-card-key">{app.key}</div>
              {app.description && (
                <div className="app-card-desc">{app.description}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
