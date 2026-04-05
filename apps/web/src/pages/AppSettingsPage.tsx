import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type AppDTO, type AppMemberDTO, type AdminUserDTO } from "../api/client.js";

export function AppSettingsPage() {
  const { appId } = useParams<{ appId: string }>();
  const [app, setApp] = useState<AppDTO | null>(null);
  const [members, setMembers] = useState<AppMemberDTO[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUserDTO[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("viewer");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!appId) return;
    api.apps.get(appId).then(setApp).catch(console.error);
    api.members.list(appId).then(setMembers).catch(console.error);
    api.admin.users.list(100, 0).then((r) => setAllUsers(r.users)).catch(() => {
      // Non-admin users can't list all users — that's OK
    });
  }, [appId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!appId || !selectedUserId) return;
    setError("");
    try {
      const member = await api.members.add(appId, selectedUserId, selectedRole);
      // Re-fetch to get enriched data with email/name
      const updated = await api.members.list(appId);
      setMembers(updated);
      setSelectedUserId("");
      setSelectedRole("viewer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    }
  }

  async function handleRemove(memberId: string) {
    if (!appId) return;
    try {
      await api.members.remove(appId, memberId);
      setMembers((prev) => prev.filter((m) => m.id.value !== memberId));
    } catch {
      // ignore
    }
  }

  const existingUserIds = new Set(members.map((m) => m.userId));
  const availableUsers = allUsers.filter((u) => !existingUserIds.has(u.id.value));

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          {app ? `Access control for ${app.name}` : "Loading..."}
        </p>
      </div>

      <div className="card">
        <div className="card-title">Members</div>

        {availableUsers.length > 0 && (
          <form onSubmit={handleAdd} style={{ marginBottom: "1rem" }}>
            <div className="form-row">
              <div className="form-field" style={{ flex: 1 }}>
                <label>User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  style={{ padding: "0.5rem", background: "var(--color-input-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text)", width: "100%" }}
                >
                  <option value="">Select user...</option>
                  {availableUsers.map((u) => (
                    <option key={u.id.value} value={u.id.value}>{u.email} ({u.name})</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  style={{ padding: "0.5rem", background: "var(--color-input-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text)" }}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <button className="btn btn-primary" type="submit">Add</button>
            </div>
            {error && <p className="error-text">{error}</p>}
          </form>
        )}

        {members.length === 0 ? (
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
            No members yet. Add users to control who can access this application.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id.value}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{m.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{m.email}</div>
                    </td>
                    <td><span className="badge badge-env">{m.role}</span></td>
                    <td>
                      <button
                        className="btn btn-ghost"
                        style={{ color: "var(--color-red)", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                        onClick={() => handleRemove(m.id.value)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
