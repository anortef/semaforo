import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

interface HealthData {
  database: string;
  users: number;
  apps: number;
  uptime: number;
  memoryMb: number;
  loadAvg: [number, number, number];
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

export function AdminHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.admin.health()
      .then(setHealth)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">API Service Health</h1>
        <p className="page-subtitle">Resource usage for the API process</p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--color-red)" }}>
          <p style={{ color: "var(--color-red)" }}>Failed to fetch health status</p>
        </div>
      )}

      {health && (
        <div className="env-grid">
          <div className="env-card">
            <div className="env-card-name">Database</div>
            <div style={{ marginTop: "0.5rem", color: health.database === "ok" ? "var(--color-green)" : "var(--color-red)", fontWeight: 600 }}>
              {health.database === "ok" ? "Connected" : "Error"}
            </div>
          </div>
          <div className="env-card">
            <div className="env-card-name">Memory</div>
            <div style={{ marginTop: "0.5rem", fontSize: "1.5rem", fontWeight: 700 }}>{health.memoryMb} MB</div>
          </div>
          <div className="env-card">
            <div className="env-card-name">CPU Load</div>
            <div style={{ marginTop: "0.5rem", fontSize: "1rem", fontWeight: 600 }}>
              {health.loadAvg[0].toFixed(2)} / {health.loadAvg[1].toFixed(2)} / {health.loadAvg[2].toFixed(2)}
            </div>
            <div style={{ fontSize: "0.625rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>1m / 5m / 15m</div>
          </div>
          <div className="env-card">
            <div className="env-card-name">Uptime</div>
            <div style={{ marginTop: "0.5rem", fontSize: "1rem", fontWeight: 600 }}>{formatUptime(health.uptime)}</div>
          </div>
          <div className="env-card">
            <div className="env-card-name">Users</div>
            <div style={{ marginTop: "0.5rem", fontSize: "1.5rem", fontWeight: 700 }}>{health.users}</div>
          </div>
          <div className="env-card">
            <div className="env-card-name">Applications</div>
            <div style={{ marginTop: "0.5rem", fontSize: "1.5rem", fontWeight: 700 }}>{health.apps}</div>
          </div>
        </div>
      )}
    </div>
  );
}
