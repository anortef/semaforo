import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

interface HealthData {
  database: string;
  users: number;
  apps: number;
  uptime: number;
  memory?: { rss: number; heapUsed: number; heapTotal: number; external: number };
  cpu?: { user: number; system: number; cores: number };
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCpuTime(microseconds: number): string {
  if (microseconds < 1000) return `${microseconds}µs`;
  if (microseconds < 1_000_000) return `${(microseconds / 1000).toFixed(1)}ms`;
  return `${(microseconds / 1_000_000).toFixed(2)}s`;
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
        <h1 className="page-title">System Health</h1>
        <p className="page-subtitle">Infrastructure and resource usage</p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--color-red)" }}>
          <p style={{ color: "var(--color-red)" }}>Failed to fetch health status</p>
        </div>
      )}

      {health && (
        <>
          <div className="env-grid" style={{ marginBottom: "1.5rem" }}>
            <div className="env-card">
              <div className="env-card-name">Database</div>
              <div style={{ marginTop: "0.5rem", color: health.database === "ok" ? "var(--color-green)" : "var(--color-red)", fontWeight: 600 }}>
                {health.database === "ok" ? "Connected" : "Error"}
              </div>
            </div>
            <div className="env-card">
              <div className="env-card-name">Users</div>
              <div style={{ marginTop: "0.5rem", fontSize: "1.5rem", fontWeight: 700 }}>{health.users}</div>
            </div>
            <div className="env-card">
              <div className="env-card-name">Applications</div>
              <div style={{ marginTop: "0.5rem", fontSize: "1.5rem", fontWeight: 700 }}>{health.apps}</div>
            </div>
            <div className="env-card">
              <div className="env-card-name">Uptime</div>
              <div style={{ marginTop: "0.5rem", fontSize: "1rem", fontWeight: 600 }}>{formatUptime(health.uptime)}</div>
            </div>
          </div>

          {health.memory && (
            <div className="card" style={{ marginBottom: "1rem" }}>
              <div className="card-title">Memory</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: "1.25rem" }}>Metric</th>
                      <th style={{ textAlign: "right" }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ paddingLeft: "1.25rem" }}>RSS (total resident)</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace" }}>{formatBytes(health.memory.rss)}</td>
                    </tr>
                    <tr>
                      <td style={{ paddingLeft: "1.25rem" }}>Heap Used</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace" }}>{formatBytes(health.memory.heapUsed)}</td>
                    </tr>
                    <tr>
                      <td style={{ paddingLeft: "1.25rem" }}>Heap Total</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace" }}>{formatBytes(health.memory.heapTotal)}</td>
                    </tr>
                    <tr>
                      <td style={{ paddingLeft: "1.25rem" }}>External (C++ objects)</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace" }}>{formatBytes(health.memory.external)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {health.cpu && (
            <div className="card">
              <div className="card-title">CPU</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: "1.25rem" }}>Metric</th>
                      <th style={{ textAlign: "right" }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ paddingLeft: "1.25rem" }}>User CPU time</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace" }}>{formatCpuTime(health.cpu.user)}</td>
                    </tr>
                    <tr>
                      <td style={{ paddingLeft: "1.25rem" }}>System CPU time</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace" }}>{formatCpuTime(health.cpu.system)}</td>
                    </tr>
                    <tr>
                      <td style={{ paddingLeft: "1.25rem" }}>Available cores</td>
                      <td style={{ textAlign: "right", fontFamily: "monospace" }}>{health.cpu.cores}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
