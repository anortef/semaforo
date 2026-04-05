import { useEffect, useState } from "react";
import { api, type SystemSettingDTO } from "../../api/client.js";

const KNOWN_SETTINGS = [
  { key: "publicDomain", label: "Public Domain", placeholder: "https://semaforo.example.com" },
  { key: "instanceName", label: "Instance Name", placeholder: "My Semaforo" },
];

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState<string | null>(null);

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

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">System-wide configuration</p>
      </div>

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
