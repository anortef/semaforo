import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  api,
  type AppDTO,
  type EnvironmentDTO,
  type FeatureToggleDTO,
  type ApiKeyDTO,
} from "../api/client.js";

export function TogglesPage() {
  const { appId } = useParams<{ appId: string }>();
  const [app, setApp] = useState<AppDTO | null>(null);
  const [environments, setEnvironments] = useState<EnvironmentDTO[]>([]);
  const [toggles, setToggles] = useState<FeatureToggleDTO[]>([]);
  const [toggleStates, setToggleStates] = useState<Map<string, boolean>>(new Map());
  const [rolloutMap, setRolloutMap] = useState<Map<string, number>>(new Map());
  const [abExpandedToggle, setAbExpandedToggle] = useState<string | null>(null);
  const [abSaving, setAbSaving] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedEnvKey, setSelectedEnvKey] = useState("");
  const [envKeys, setEnvKeys] = useState<Map<string, ApiKeyDTO[]>>(new Map());
  const [updatedAtMap, setUpdatedAtMap] = useState<Map<string, string>>(new Map());

  const booleanToggles = toggles.filter((t) => t.type !== "string");

  const loadToggleStates = useCallback(async () => {
    if (!app) return;
    const boolMap = new Map<string, boolean>();
    for (const env of environments) {
      try {
        const states = await api.toggles.getStates(app.key, env.key);
        for (const [toggleKey, value] of Object.entries(states)) {
          if (typeof value !== "boolean") continue;
          const toggle = toggles.find((t) => t.key === toggleKey);
          if (toggle) boolMap.set(`${toggle.id.value}:${env.id.value}`, value);
        }
      } catch { /* ignore */ }
    }
    setToggleStates(boolMap);
  }, [app, environments, toggles]);

  useEffect(() => {
    if (!appId) return;
    api.apps.get(appId).then(setApp).catch(console.error);
    api.environments.list(appId).then(setEnvironments).catch(console.error);
    api.toggles.list(appId).then(setToggles).catch(console.error);
    api.toggles.getValues(appId).then((values) => {
      const timeMap = new Map<string, string>();
      const rollMap = new Map<string, number>();
      for (const v of values) {
        const k = `${v.toggleId}:${v.environmentId}`;
        timeMap.set(k, v.updatedAt);
        rollMap.set(k, v.rolloutPercentage);
      }
      setUpdatedAtMap(timeMap);
      setRolloutMap(rollMap);
    }).catch(console.error);
  }, [appId]);

  useEffect(() => {
    for (const env of environments) {
      api.apiKeys.list(env.id.value).then((keys) => {
        setEnvKeys((prev) => new Map(prev).set(env.id.value, keys));
      }).catch(console.error);
    }
  }, [environments]);

  useEffect(() => {
    if (environments.length > 0 && !selectedEnvKey) setSelectedEnvKey(environments[0].key);
  }, [environments, selectedEnvKey]);

  useEffect(() => {
    if (app && environments.length > 0 && toggles.length > 0) loadToggleStates();
  }, [app, environments, toggles, loadToggleStates]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!appId) return;
    setError("");
    try {
      const toggle = await api.toggles.create(appId, { name, key, type: "boolean" });
      setToggles((prev) => [...prev, toggle]);
      setName(""); setKey(""); setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create toggle");
    }
  }

  async function handleToggle(toggleId: string, envId: string, enabled: boolean) {
    const stateKey = `${toggleId}:${envId}`;
    setToggleStates((prev) => new Map(prev).set(stateKey, enabled));
    try {
      const result = await api.toggles.setValue(toggleId, envId, { enabled });
      setUpdatedAtMap((prev) => new Map(prev).set(stateKey, result.updatedAt));
    } catch {
      setToggleStates((prev) => new Map(prev).set(stateKey, !enabled));
    }
  }

  function handleRolloutChange(toggleId: string, envId: string, rolloutPercentage: number) {
    const stateKey = `${toggleId}:${envId}`;
    setRolloutMap((prev) => new Map(prev).set(stateKey, rolloutPercentage));
  }

  async function handleApplyAb(toggleId: string) {
    setAbSaving(toggleId);
    try {
      for (const env of environments) {
        const stateKey = `${toggleId}:${env.id.value}`;
        const pct = rolloutMap.get(stateKey) ?? 100;
        const result = await api.toggles.setValue(toggleId, env.id.value, { rolloutPercentage: pct });
        setUpdatedAtMap((prev) => new Map(prev).set(stateKey, result.updatedAt));
      }
    } catch { /* ignore */ }
    setAbSaving(null);
  }

  function toggleAb(toggleId: string) {
    if (abExpandedToggle === toggleId) {
      setAbExpandedToggle(null);
    } else {
      setAbExpandedToggle(toggleId);
    }
  }

  function isAbActive(toggleId: string): boolean {
    return environments.some((env) => {
      const pct = rolloutMap.get(`${toggleId}:${env.id.value}`);
      return pct !== undefined && pct < 100;
    });
  }

  function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  const selectedEnv = environments.find((e) => e.key === selectedEnvKey);
  const selectedEnvApiKey = selectedEnv ? (envKeys.get(selectedEnv.id.value) ?? [])[0]?.key : undefined;
  const apiBaseUrl = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "";
  const apiEndpoint = app ? `/api/public/apps/${app.key}/environments/${selectedEnvKey}/toggles` : "";

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Feature Toggles</h1>
          <p className="page-subtitle">{app ? `Boolean toggles for ${app.name}` : "Loading..."}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Toggle"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-title">Create Boolean Toggle</div>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-field" style={{ flex: 1 }}>
                <label>Name</label>
                <input placeholder="New Checkout" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-field" style={{ flex: 1 }}>
                <label>Key (camelCase)</label>
                <input placeholder="newCheckout" value={key} onChange={(e) => setKey(e.target.value)} required />
              </div>
              <button className="btn btn-primary" type="submit">Create</button>
            </div>
            {error && <p className="error-text">{error}</p>}
          </form>
        </div>
      )}

      {app && environments.length > 0 && (
        <div className="card api-info-card">
          <div className="card-title">API Endpoint</div>
          <p className="api-info-desc">The API key determines the environment. Returns boolean toggles only.</p>
          <div className="api-info-env-selector">
            <label>Environment:</label>
            <div className="api-env-tabs">
              {environments.map((env) => (
                <button key={env.id.value} className={`api-env-tab${selectedEnvKey === env.key ? " api-env-tab-active" : ""}`} onClick={() => setSelectedEnvKey(env.key)}>{env.name}</button>
              ))}
            </div>
          </div>
          <div className="api-info-method">
            <span className="api-method-badge">GET</span>
            <code className="api-url">{apiBaseUrl}/api/public/toggles</code>
          </div>
          <div className="api-info-curl">
            <div className="api-info-curl-label">cURL</div>
            <pre className="api-code-block">
              <code>{`curl ${apiBaseUrl}/api/public/toggles \\
  -H "x-api-key: ${selectedEnvApiKey ?? "<your-api-key>"}"`}</code>
            </pre>
          </div>
        </div>
      )}

      {environments.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon">&#9729;</div><p>Create environments first before managing toggles.</p></div></div>
      ) : booleanToggles.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">&#9881;</div><p>No boolean toggles yet. Create one to get started.</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ paddingLeft: "1.25rem" }}>Toggle</th>
                  {environments.map((env) => (
                    <th key={env.id.value} style={{ textAlign: "center", minWidth: 100 }}>{env.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {booleanToggles.map((toggle) => {
                  const abActive = isAbActive(toggle.id.value);
                  const abOpen = abExpandedToggle === toggle.id.value;
                  return (
                    <React.Fragment key={toggle.id.value}>
                      <tr>
                        <td style={{ paddingLeft: "1.25rem" }}>
                          <div style={{ fontWeight: 500 }}>{toggle.name}</div>
                          <span className="badge badge-key">{toggle.key}</span>
                          <button
                            className="btn btn-ghost"
                            style={{ marginLeft: "0.5rem", fontSize: "0.625rem", padding: "0.125rem 0.375rem", color: abActive ? "var(--color-accent)" : "var(--color-text-muted)" }}
                            onClick={() => toggleAb(toggle.id.value)}
                          >
                            A/B Testing
                          </button>
                        </td>
                        {environments.map((env) => {
                          const stateKey = `${toggle.id.value}:${env.id.value}`;
                          const isEnabled = toggleStates.get(stateKey) ?? false;
                          const pct = rolloutMap.get(stateKey) ?? 100;
                          return (
                            <td key={env.id.value} style={{ textAlign: "center", verticalAlign: "middle" }}>
                              <label className="toggle-switch">
                                <input type="checkbox" checked={isEnabled} onChange={(e) => handleToggle(toggle.id.value, env.id.value, e.target.checked)} />
                                <span className="toggle-slider" />
                              </label>
                              {isEnabled && pct < 100 && (
                                <div style={{ fontSize: "0.625rem", color: "var(--color-accent)", marginTop: "0.125rem" }}>{pct}%</div>
                              )}
                              {updatedAtMap.get(stateKey) && (
                                <div style={{ fontSize: "0.625rem", color: "var(--color-text-muted)", marginTop: "0.125rem" }} title={new Date(updatedAtMap.get(stateKey)!).toLocaleString()}>
                                  {formatTimeAgo(updatedAtMap.get(stateKey)!)}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      {abOpen && (
                        <tr>
                          <td colSpan={1 + environments.length} style={{ paddingLeft: "1.25rem", background: "var(--color-surface-hover)" }}>
                            <div style={{ padding: "0.75rem 0" }}>
                              <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem" }}>A/B Testing — Rollout Percentage</div>
                              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
                                {environments.map((env) => {
                                  const stateKey = `${toggle.id.value}:${env.id.value}`;
                                  const pct = rolloutMap.get(stateKey) ?? 100;
                                  const envEnabled = toggleStates.get(stateKey) ?? false;
                                  return (
                                    <div key={env.id.value} className="form-field" style={{ opacity: envEnabled ? 1 : 0.4 }}>
                                      <label>{env.name}</label>
                                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                        <input
                                          type="number" min={0} max={100} value={pct}
                                          disabled={!envEnabled}
                                          onChange={(e) => handleRolloutChange(toggle.id.value, env.id.value, parseInt(e.target.value) || 0)}
                                          style={{ width: "64px", padding: "0.375rem", background: "var(--color-input-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: envEnabled ? "var(--color-text)" : "var(--color-text-muted)", fontSize: "0.8125rem", textAlign: "center" }}
                                        />
                                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>%</span>
                                      </div>
                                    </div>
                                  );
                                })}
                                <button
                                  className="btn btn-primary"
                                  style={{ fontSize: "0.75rem" }}
                                  disabled={abSaving === toggle.id.value}
                                  onClick={() => handleApplyAb(toggle.id.value)}
                                >
                                  {abSaving === toggle.id.value ? "Saving..." : "Apply"}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
