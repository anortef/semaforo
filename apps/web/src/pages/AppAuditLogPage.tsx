import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type AppDTO, type AuditLogEntryDTO } from "../api/client.js";

export function AppAuditLogPage() {
  const { appId } = useParams<{ appId: string }>();
  const [app, setApp] = useState<AppDTO | null>(null);
  const [entries, setEntries] = useState<AuditLogEntryDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 25;

  useEffect(() => {
    if (!appId) return;
    api.apps.get(appId).then(setApp).catch(console.error);
  }, [appId]);

  useEffect(() => {
    if (!appId) return;
    api.apps.auditLog(appId, limit, offset).then((r) => {
      setEntries(r.entries);
      setTotal(r.total);
    }).catch(console.error);
  }, [appId, offset]);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Audit Log</h1>
        <p className="page-subtitle">
          {app ? `Activity history for ${app.name}` : "Loading..."}
          {total > 0 && ` — ${total} events`}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#9998;</div>
          <p>No activity recorded yet.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ paddingLeft: "1.25rem" }}>Time</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id.value}>
                    <td style={{ paddingLeft: "1.25rem", whiteSpace: "nowrap", fontSize: "0.8125rem" }}>
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td><span className="badge badge-env">{e.action}</span></td>
                    <td><span className="badge badge-key">{e.resourceType}: {e.resourceName}</span></td>
                    <td style={{ fontSize: "0.8125rem" }}>{e.userName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {total > limit && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "center" }}>
          <button
            className="btn btn-ghost"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
          >
            Previous
          </button>
          <span style={{ padding: "0.5rem", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
            {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <button
            className="btn btn-ghost"
            disabled={offset + limit >= total}
            onClick={() => setOffset(offset + limit)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
