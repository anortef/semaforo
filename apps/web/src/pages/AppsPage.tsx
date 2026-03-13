import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type AppDTO } from "../api/client.js";

export function AppsPage() {
  const [apps, setApps] = useState<AppDTO[]>([]);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.apps.list().then(setApps).catch(console.error);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const app = await api.apps.create({ name, key });
      setApps((prev) => [app, ...prev]);
      setName("");
      setKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create app");
    }
  }

  return (
    <div>
      <h2>Applications</h2>

      <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem" }}>
        <h3>Create App</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            placeholder="App name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            placeholder="app-key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
          />
          <button type="submit">Create</button>
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>

      {apps.length === 0 ? (
        <p>No applications yet. Create one above.</p>
      ) : (
        <ul>
          {apps.map((app) => (
            <li key={app.id.value}>
              <Link to={`/apps/${app.id.value}`}>
                <strong>{app.name}</strong> ({app.key})
              </Link>
              {app.description && (
                <span style={{ color: "#666" }}> — {app.description}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
