import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api, type AppDTO, type AppMetricsDTO } from "../api/client.js";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatTtl(seconds: number): string {
  if (seconds === 0) return "Expired";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function AppMetricsPage() {
  const { appId } = useParams<{ appId: string }>();
  const [app, setApp] = useState<AppDTO | null>(null);
  const [metrics, setMetrics] = useState<AppMetricsDTO | null>(null);

  const loadMetrics = useCallback(() => {
    if (!appId) return;
    api.apps.metrics(appId).then(setMetrics).catch(console.error);
  }, [appId]);

  useEffect(() => {
    if (!appId) return;
    api.apps.get(appId).then(setApp).catch(console.error);
    loadMetrics();
    const interval = setInterval(loadMetrics, 5000);
    return () => clearInterval(interval);
  }, [appId, loadMetrics]);

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Metrics</h1>
          <p className="page-subtitle">
            {app ? `Statistics for ${app.name}` : "Loading..."}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={loadMetrics}>Refresh</button>
      </div>

      {metrics && (
        <>
          <div className="env-grid" style={{ marginBottom: "1.5rem" }}>
            <div className="env-card">
              <div className="env-card-name">Toggles</div>
              <div style={{ marginTop: "0.5rem", fontSize: "2rem", fontWeight: 700 }}>
                {metrics.toggleCount}
              </div>
            </div>
            <div className="env-card">
              <div className="env-card-name">Environments</div>
              <div style={{ marginTop: "0.5rem", fontSize: "2rem", fontWeight: 700 }}>
                {metrics.environments.length}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: "1.25rem" }}>Environment</th>
                    <th>Configured TTL</th>
                    <th>Cache Status</th>
                    <th>Cache Size</th>
                    <th>Remaining TTL</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.environments.map((env) => (
                    <tr key={env.id}>
                      <td style={{ paddingLeft: "1.25rem" }}>
                        <div style={{ fontWeight: 500 }}>{env.name}</div>
                        <span className="badge badge-key">{env.key}</span>
                      </td>
                      <td>{env.cacheTtlSeconds === 0 ? "Disabled" : `${env.cacheTtlSeconds}s`}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: env.cache ? "rgba(0,184,148,0.15)" : "rgba(255,255,255,0.06)",
                            color: env.cache ? "var(--color-green)" : "var(--color-text-muted)",
                          }}
                        >
                          {env.cache ? "Cached" : "Empty"}
                        </span>
                      </td>
                      <td>{env.cache ? formatBytes(env.cache.sizeBytes) : "—"}</td>
                      <td>{env.cache ? formatTtl(env.cache.remainingTtl) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
