import { useEffect, useState, useRef } from "react";
import { api, type SystemSettingDTO } from "../../api/client.js";
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
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.filename}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{b.filename}</td>
                    <td>{(b.size / 1024).toFixed(1)} KB</td>
                    <td>{new Date(b.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
