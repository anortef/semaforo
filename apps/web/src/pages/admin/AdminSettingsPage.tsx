import { useEffect, useState, useRef } from "react";
import { api, type SystemSettingDTO, type BackupValidationReport } from "../../api/client.js";
import { useApps } from "../../context/AppsContext.js";

const KNOWN_SETTINGS = [
  { key: "publicDomain", label: "Public Domain", placeholder: "https://semaforo.example.com" },
  { key: "instanceName", label: "Instance Name", placeholder: "My Semaforo" },
  { key: "rateLimitPublic", label: "Public Rate Limit (req/min)", placeholder: "100000" },
  { key: "rateLimitCacheMiss", label: "Cache Miss Rate Limit (req/min)", placeholder: "100" },
];

const SCHEDULE_OPTIONS = [
  { value: "", label: "Disabled" },
  { value: "1h", label: "Every hour" },
  { value: "12h", label: "Every 12 hours" },
  { value: "24h", label: "Every day" },
];

const RETENTION_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "15", label: "15 days" },
  { value: "30", label: "30 days" },
];

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState<string | null>(null);
  const [importError, setImportError] = useState("");
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [backups, setBackups] = useState<Array<{ filename: string; size: number; createdAt: string }>>([]);
  const [backupCreating, setBackupCreating] = useState(false);
  const [customSchedule, setCustomSchedule] = useState(false);
  const [customRetention, setCustomRetention] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreWarnings, setRestoreWarnings] = useState<string[]>([]);
  const [restoreError, setRestoreError] = useState("");
  const [cleanRestore, setCleanRestore] = useState(false);
  const [validating, setValidating] = useState<string | null>(null);
  const [validationReport, setValidationReport] = useState<BackupValidationReport | null>(null);
  const [validationError, setValidationError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refresh } = useApps();

  useEffect(() => {
    api.admin.settings.list().then((list) => {
      const map = new Map<string, string>();
      for (const s of list) map.set(s.key, s.value);
      setSettings(map);
      // Check if current values are custom
      const schedule = map.get("backupSchedule") ?? "";
      if (schedule && !SCHEDULE_OPTIONS.some((o) => o.value === schedule)) setCustomSchedule(true);
      const retention = map.get("backupRetention") ?? "7";
      if (!RETENTION_OPTIONS.some((o) => o.value === retention)) setCustomRetention(true);
    }).catch(console.error);
    api.admin.backups.list().then(setBackups).catch(console.error);
  }, []);

  async function handleSave(key: string, value: string) {
    if (!value.trim()) return;
    setSaving(key);
    try {
      await api.admin.settings.update(key, value.trim());
      setSettings((prev) => new Map(prev).set(key, value.trim()));
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  }

  async function handleExportAll() {
    const data = await api.admin.export();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "semaforo-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportAll(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    setImportWarnings([]);
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      const result = await api.admin.import(data);
      if (result.warnings?.length > 0) {
        setImportWarnings(result.warnings);
      }
      await refresh();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRestore(filename: string) {
    setRestoring(true);
    setRestoreError("");
    setRestoreWarnings([]);
    try {
      const result = await api.admin.backups.restore(filename, cleanRestore);
      if (result.warnings?.length > 0) {
        setRestoreWarnings(result.warnings);
      }
      await refresh();
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : "Restore failed");
    }
    setRestoring(false);
    setRestoreConfirm(null);
    setCleanRestore(false);
  }

  async function handleValidate(filename: string) {
    setValidating(filename);
    setValidationReport(null);
    setValidationError("");
    try {
      const report = await api.admin.backups.validate(filename);
      setValidationReport(report);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Validation failed");
    }
    setValidating(null);
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">System-wide configuration</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-ghost" onClick={handleExportAll}>Export All</button>
          <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>Import</button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportAll} style={{ display: "none" }} />
        </div>
      </div>

      {importError && <p className="error-text" style={{ marginBottom: "1rem" }}>{importError}</p>}
      {importWarnings.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem", background: "var(--color-warning-bg, #fef3cd)", border: "1px solid var(--color-warning-border, #ffc107)" }}>
          <div className="card-title" style={{ fontSize: "0.8125rem" }}>Import Warnings</div>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.8125rem" }}>
            {importWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {KNOWN_SETTINGS.map(({ key, label, placeholder }) => (
        <div key={key} className="card">
          <div className="card-title">{label}</div>
          <div className="form-row">
            <div className="form-field" style={{ flex: 1 }}>
              <input
                placeholder={placeholder}
                value={settings.get(key) ?? ""}
                onChange={(e) => setSettings((prev) => new Map(prev).set(key, e.target.value))}
              />
            </div>
            <button
              className="btn btn-primary"
              disabled={saving === key}
              onClick={() => handleSave(key, settings.get(key) ?? "")}
            >
              {saving === key ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ))}

      <div style={{ marginTop: "2rem" }}>
        <h2 className="page-title" style={{ fontSize: "1.125rem" }}>Backups</h2>
        <p className="page-subtitle">Scheduled backups are stored as compressed exports in the backups volume.</p>
      </div>

      <div className="card">
        <div className="card-title">Schedule</div>
        <div className="form-row" style={{ marginBottom: "0.75rem" }}>
          <div className="form-field" style={{ flex: 1 }}>
            <label>Frequency</label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <select
                style={{ flex: 1, padding: "0.375rem 0.625rem", fontSize: "0.8125rem", background: "var(--color-input-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text)" }}
                value={customSchedule ? "__custom__" : (settings.get("backupSchedule") ?? "")}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setCustomSchedule(true);
                  } else {
                    setCustomSchedule(false);
                    setSettings((prev) => new Map(prev).set("backupSchedule", e.target.value));
                  }
                }}
              >
                {SCHEDULE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
                <option value="__custom__">Custom (hours)</option>
              </select>
              {customSchedule && (
                <input
                  type="number" min="1" placeholder="Hours"
                  style={{ width: "80px", padding: "0.375rem 0.625rem", fontSize: "0.8125rem", background: "var(--color-input-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text)" }}
                  value={settings.get("backupSchedule") ?? ""}
                  onChange={(e) => setSettings((prev) => new Map(prev).set("backupSchedule", e.target.value))}
                />
              )}
            </div>
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label>Retention</label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <select
                style={{ flex: 1, padding: "0.375rem 0.625rem", fontSize: "0.8125rem", background: "var(--color-input-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text)" }}
                value={customRetention ? "__custom__" : (settings.get("backupRetention") ?? "7")}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setCustomRetention(true);
                  } else {
                    setCustomRetention(false);
                    setSettings((prev) => new Map(prev).set("backupRetention", e.target.value));
                  }
                }}
              >
                {RETENTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
                <option value="__custom__">Custom (days)</option>
              </select>
              {customRetention && (
                <input
                  type="number" min="1" placeholder="Days"
                  style={{ width: "80px", padding: "0.375rem 0.625rem", fontSize: "0.8125rem", background: "var(--color-input-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text)" }}
                  value={settings.get("backupRetention") ?? "7"}
                  onChange={(e) => setSettings((prev) => new Map(prev).set("backupRetention", e.target.value))}
                />
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn btn-primary"
            disabled={saving === "backupSchedule"}
            onClick={async () => {
              await handleSave("backupSchedule", settings.get("backupSchedule") ?? "");
              await handleSave("backupRetention", settings.get("backupRetention") ?? "7");
            }}
          >
            Save Schedule
          </button>
          <button
            className="btn btn-ghost"
            disabled={backupCreating}
            onClick={async () => {
              setBackupCreating(true);
              try {
                const backup = await api.admin.backups.create();
                setBackups((prev) => [backup, ...prev]);
              } catch { /* ignore */ }
              setBackupCreating(false);
            }}
          >
            {backupCreating ? "Creating..." : "Backup Now"}
          </button>
        </div>
      </div>

      {restoreError && <p className="error-text" style={{ marginBottom: "1rem" }}>{restoreError}</p>}
      {restoreWarnings.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem", background: "var(--color-warning-bg, #fef3cd)", border: "1px solid var(--color-warning-border, #ffc107)" }}>
          <div className="card-title" style={{ fontSize: "0.8125rem" }}>Restore Warnings</div>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.8125rem" }}>
            {restoreWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {backups.length > 0 && (
        <div className="card">
          <div className="card-title">Backup History</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Size</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.filename}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{b.filename}</td>
                    <td>{(b.size / 1024).toFixed(1)} KB</td>
                    <td>{new Date(b.createdAt).toLocaleString()}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                          disabled={validating === b.filename}
                          onClick={() => handleValidate(b.filename)}
                        >
                          {validating === b.filename ? "Validating..." : "Validate"}
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                          onClick={() => setRestoreConfirm(b.filename)}
                        >
                          Restore
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {validationError && <p className="error-text" style={{ marginBottom: "1rem" }}>{validationError}</p>}
      {validationReport && (
        <div className="card" style={{
          marginBottom: "1rem",
          border: `1px solid ${validationReport.valid ? "var(--color-success-border, #28a745)" : "var(--color-danger, #dc3545)"}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div className="card-title" style={{
              margin: 0,
              color: validationReport.valid ? "var(--color-success, #28a745)" : "var(--color-danger, #dc3545)",
            }}>
              {validationReport.valid ? "Backup Valid" : "Backup Has Errors"}
            </div>
            <button
              className="btn btn-ghost"
              style={{ fontSize: "0.75rem", padding: "0.125rem 0.375rem" }}
              onClick={() => { setValidationReport(null); setValidationError(""); }}
            >
              Dismiss
            </button>
          </div>
          {validationReport.exportedAt && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>
              Exported at: {new Date(validationReport.exportedAt).toLocaleString()}
            </p>
          )}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem", fontSize: "0.8125rem" }}>
            <span><strong>{validationReport.summary.users}</strong> users</span>
            <span><strong>{validationReport.summary.apps}</strong> apps</span>
            <span><strong>{validationReport.summary.environments}</strong> environments</span>
            <span><strong>{validationReport.summary.toggles}</strong> toggles</span>
            <span><strong>{validationReport.summary.secrets}</strong> secrets</span>
            <span><strong>{validationReport.summary.settings}</strong> settings</span>
            <span><strong>{validationReport.summary.apiKeys}</strong> API keys</span>
          </div>
          {validationReport.errors.length > 0 && (
            <div style={{ marginBottom: "0.5rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-danger, #dc3545)", marginBottom: "0.25rem" }}>Errors</div>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.8125rem" }}>
                {validationReport.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          {validationReport.conflicts.existingUsers.length > 0 && (
            <div style={{ marginBottom: "0.5rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.25rem" }}>Existing users (will be skipped)</div>
              <p style={{ margin: 0, fontSize: "0.75rem", fontFamily: "monospace" }}>
                {validationReport.conflicts.existingUsers.join(", ")}
              </p>
            </div>
          )}
          {validationReport.conflicts.existingApps.length > 0 && (
            <div style={{ marginBottom: "0.5rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-danger, #dc3545)", marginBottom: "0.25rem" }}>Existing apps (will fail to import)</div>
              <p style={{ margin: 0, fontSize: "0.75rem", fontFamily: "monospace" }}>
                {validationReport.conflicts.existingApps.join(", ")}
              </p>
            </div>
          )}
          {validationReport.warnings.length > 0 && (
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-warning, #ffc107)", marginBottom: "0.25rem" }}>Warnings</div>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.8125rem" }}>
                {validationReport.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {restoreConfirm && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => { if (!restoring) { setRestoreConfirm(null); setCleanRestore(false); } }}
        >
          <div
            className="card"
            style={{ maxWidth: "480px", width: "90%", margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-title" style={{ color: "var(--color-danger, #dc3545)" }}>
              Confirm Restore
            </div>
            <p style={{ fontSize: "0.8125rem", marginBottom: "0.5rem" }}>
              You are about to restore from:
            </p>
            <p style={{ fontFamily: "monospace", fontSize: "0.75rem", marginBottom: "1rem", wordBreak: "break-all" }}>
              {restoreConfirm}
            </p>
            <p style={{ fontSize: "0.8125rem", marginBottom: "1rem", color: "var(--color-danger, #dc3545)", fontWeight: 600 }}>
              Warning: This will import all data from the backup. Existing data that conflicts with the backup may be overwritten. This action cannot be undone.
            </p>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.75rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={cleanRestore}
                onChange={(e) => setCleanRestore(e.target.checked)}
                style={{ marginTop: "0.2rem" }}
              />
              <span style={{ fontSize: "0.8125rem" }}>
                Erase all existing data before restoring (keeps admin account and .env values)
              </span>
            </label>
            {cleanRestore && (
              <p style={{ fontSize: "0.8125rem", marginBottom: "0.75rem", padding: "0.5rem", background: "var(--color-danger-bg, #f8d7da)", border: "1px solid var(--color-danger, #dc3545)", borderRadius: "var(--radius-sm)", color: "var(--color-danger, #dc3545)", fontWeight: 600 }}>
                All apps, environments, toggles, secrets, users (except admin), settings, and audit logs will be permanently deleted before the backup is imported.
              </p>
            )}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                className="btn btn-ghost"
                disabled={restoring}
                onClick={() => { setRestoreConfirm(null); setCleanRestore(false); }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ background: "var(--color-danger, #dc3545)", borderColor: "var(--color-danger, #dc3545)" }}
                disabled={restoring}
                onClick={() => handleRestore(restoreConfirm)}
              >
                {restoring ? "Restoring..." : cleanRestore ? "Erase & Restore" : "Restore Backup"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
