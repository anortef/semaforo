import { useEffect, useState, useRef } from "react";
import { api, type SystemSettingDTO } from "../../api/client.js";
import { useApps } from "../../context/AppsContext.js";

const KNOWN_SETTINGS = [
  { key: "publicDomain", label: "Public Domain", placeholder: "https://semaforo.example.com" },
  { key: "instanceName", label: "Instance Name", placeholder: "My Semaforo" },
  { key: "rateLimitPublic", label: "Public Rate Limit (req/min)", placeholder: "100000" },
  { key: "rateLimitCacheMiss", label: "Cache Miss Rate Limit (req/min)", placeholder: "100" },
];

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState<string | null>(null);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refresh } = useApps();

  useEffect(() => {
    api.admin.settings.list().then((list) => {
      const map = new Map<string, string>();
      for (const s of list) map.set(s.key, s.value);
      setSettings(map);
    }).catch(console.error);
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
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      await api.admin.import(data);
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
    </div>
  );
}
