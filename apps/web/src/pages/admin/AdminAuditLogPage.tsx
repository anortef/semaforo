import { useEffect, useState } from "react";
import { api, type AuditLogEntryDTO } from "../../api/client.js";

export function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntryDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 25;

  useEffect(() => {
    api.admin.auditLog.list(limit, offset).then((r) => {
      setEntries(r.entries);
      setTotal(r.total);
    }).catch(console.error);
  }, [offset]);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Audit Log</h1>
        <p className="page-subtitle">{total} total events</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ paddingLeft: "1.25rem" }}>Time</th>
                <th>Action</th>
                <th>Resource</th>
                <th>User ID</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id.value}>
                  <td style={{ paddingLeft: "1.25rem", whiteSpace: "nowrap", fontSize: "0.8125rem" }}>
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td><span className="badge badge-env">{e.action}</span></td>
                  <td>
                    <span className="badge badge-key">{e.resourceType}:{e.resourceId.slice(0, 8)}</span>
                  </td>
                  <td style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
                    {e.userId.slice(0, 8)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
