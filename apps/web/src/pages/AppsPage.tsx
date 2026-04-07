import { useState } from "react";
import { Link } from "react-router-dom";
import { api, type AppDTO } from "../api/client.js";
import { useApps } from "../context/AppsContext.js";

export function AppsPage() {
  const { apps, refresh } = useApps();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AppDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function handleDeleteApp() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await api.apps.delete(deleteConfirm.id.value);
      await refresh();
    } catch { /* ignore */ }
    setDeleting(false);
    setDeleteConfirm(null);
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
            <div key={app.id.value} className="app-card" style={{ position: "relative" }}>
              <Link to={`/apps/${app.id.value}/toggles`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <div className="app-card-name">{app.name}</div>
                <div className="app-card-key">{app.key}</div>
                {app.description && (
                  <div className="app-card-desc">{app.description}</div>
                )}
              </Link>
              <button
                className="btn btn-ghost"
                style={{ position: "absolute", top: "0.5rem", right: "0.5rem", fontSize: "0.625rem", padding: "0.125rem 0.375rem", color: "var(--color-danger, #dc3545)" }}
                onClick={(e) => { e.preventDefault(); setDeleteConfirm(app); }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => !deleting && setDeleteConfirm(null)}
        >
          <div className="card" style={{ maxWidth: "420px", width: "90%", margin: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="card-title" style={{ color: "var(--color-danger, #dc3545)" }}>Delete Application</div>
            <p style={{ fontSize: "0.8125rem", marginBottom: "0.5rem" }}>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong> ({deleteConfirm.key})?
            </p>
            <p style={{ fontSize: "0.8125rem", marginBottom: "1rem", color: "var(--color-danger, #dc3545)", fontWeight: 600 }}>
              This will permanently delete all environments, toggles, secrets, API keys, and members associated with this application.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" disabled={deleting} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ background: "var(--color-danger, #dc3545)", borderColor: "var(--color-danger, #dc3545)" }}
                disabled={deleting}
                onClick={handleDeleteApp}
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
