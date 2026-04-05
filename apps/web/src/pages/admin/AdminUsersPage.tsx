import { useEffect, useState } from "react";
import { api, type AdminUserDTO } from "../../api/client.js";

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserDTO[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");

  useEffect(() => {
    api.admin.users.list().then((r) => setUsers(r.users)).catch(console.error);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const user = await api.admin.users.create({ email, name, password, role });
      setUsers((prev) => [user, ...prev]);
      setEmail(""); setName(""); setPassword(""); setRole("user");
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  }

  async function handleToggleDisabled(userId: string, disabled: boolean) {
    try {
      const updated = await api.admin.users.update(userId, { disabled });
      setUsers((prev) => prev.map((u) => (u.id.value === userId ? updated : u)));
    } catch {
      // ignore
    }
  }

  async function handleDelete(userId: string) {
    try {
      await api.admin.users.delete(userId);
      setUsers((prev) => prev.filter((u) => u.id.value !== userId));
    } catch {
      // ignore
    }
  }

  async function handleResetPassword(userId: string) {
    const newPassword = prompt("Enter new password:");
    if (!newPassword) return;
    try {
      await api.admin.users.resetPassword(userId, newPassword);
    } catch {
      // ignore
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const updated = await api.admin.users.update(userId, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id.value === userId ? updated : u)));
    } catch {
      // ignore
    }
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage user accounts and roles</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "+ New User"}
        </button>
      </div>

      {showCreate && (
        <div className="card">
          <div className="card-title">Create User</div>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-field" style={{ flex: 1 }}>
                <label>Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="form-field" style={{ flex: 1 }}>
                <label>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-field" style={{ flex: 1 }}>
                <label>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: "0.5rem", background: "var(--color-input-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text)" }}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button className="btn btn-primary" type="submit">Create</button>
            </div>
            {error && <p className="error-text">{error}</p>}
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ paddingLeft: "1.25rem" }}>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id.value}>
                  <td style={{ paddingLeft: "1.25rem" }}>{user.email}</td>
                  <td>{user.name}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id.value, e.target.value)}
                      style={{ padding: "0.25rem", background: "var(--color-input-bg)", border: "1px solid var(--color-border)", borderRadius: "4px", color: "var(--color-text)", fontSize: "0.8125rem" }}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className={`btn ${user.disabled ? "btn-primary" : "btn-ghost"}`}
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                      onClick={() => handleToggleDisabled(user.id.value, !user.disabled)}
                    >
                      {user.disabled ? "Enable" : "Disable"}
                    </button>
                  </td>
                  <td style={{ display: "flex", gap: "0.25rem" }}>
                    <button className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }} onClick={() => handleResetPassword(user.id.value)}>
                      Reset PW
                    </button>
                    <button className="btn btn-ghost" style={{ color: "var(--color-red)", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }} onClick={() => handleDelete(user.id.value)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
