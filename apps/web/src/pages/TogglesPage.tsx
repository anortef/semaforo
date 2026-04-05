import { useEffect, useState, useCallback } from "react";
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
  const [toggleStates, setToggleStates] = useState<
    Map<string, boolean>
  >(new Map());
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedEnvKey, setSelectedEnvKey] = useState("");
  const [envKeys, setEnvKeys] = useState<Map<string, ApiKeyDTO[]>>(new Map());

  const loadToggleStates = useCallback(async () => {
    if (!app) return;
    const stateMap = new Map<string, boolean>();
    for (const env of environments) {
      try {
        const states = await api.toggles.getStates(app.key, env.key);
        for (const [toggleKey, enabled] of Object.entries(states)) {
          const toggle = toggles.find((t) => t.key === toggleKey);
          if (toggle) {
            stateMap.set(`${toggle.id.value}:${env.id.value}`, enabled);
          }
        }
      } catch {
        // ignore fetch errors
      }
    }
    setToggleStates(stateMap);
  }, [app, environments, toggles]);

  useEffect(() => {
    if (!appId) return;
    api.apps.get(appId).then(setApp).catch(console.error);
    api.environments.list(appId).then(setEnvironments).catch(console.error);
    api.toggles.list(appId).then(setToggles).catch(console.error);
  }, [appId]);

  useEffect(() => {
    for (const env of environments) {
      api.apiKeys.list(env.id.value).then((keys) => {
        setEnvKeys((prev) => new Map(prev).set(env.id.value, keys));
      }).catch(console.error);
    }
  }, [environments]);

  useEffect(() => {
    if (environments.length > 0 && !selectedEnvKey) {
      setSelectedEnvKey(environments[0].key);
    }
  }, [environments, selectedEnvKey]);

  useEffect(() => {
    if (app && environments.length > 0 && toggles.length > 0) {
      loadToggleStates();
    }
  }, [app, environments, toggles, loadToggleStates]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!appId) return;
    setError("");
    try {
      const toggle = await api.toggles.create(appId, { name, key });
      setToggles((prev) => [...prev, toggle]);
      setName("");
      setKey("");
      setShowForm(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create toggle"
      );
    }
  }

  async function handleToggle(
    toggleId: string,
    envId: string,
    enabled: boolean
  ) {
    setToggleStates((prev) => {
      const next = new Map(prev);
      next.set(`${toggleId}:${envId}`, enabled);
      return next;
    });
    try {
      await api.toggles.setValue(toggleId, envId, enabled);
    } catch {
      setToggleStates((prev) => {
        const next = new Map(prev);
        next.set(`${toggleId}:${envId}`, !enabled);
        return next;
      });
    }
  }

  const selectedEnv = environments.find((e) => e.key === selectedEnvKey);
  const selectedEnvApiKey = selectedEnv
    ? (envKeys.get(selectedEnv.id.value) ?? [])[0]?.key
    : undefined;

  const apiBaseUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}`
    : "";
  const apiEndpoint = app
    ? `/api/public/apps/${app.key}/environments/${selectedEnvKey}/toggles`
    : "";

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title">Feature Toggles</h1>
          <p className="page-subtitle">
            {app ? `Manage toggles for ${app.name}` : "Loading..."}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Toggle"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-title">Create Toggle</div>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-field" style={{ flex: 1 }}>
                <label>Name</label>
                <input
                  placeholder="New Checkout"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-field" style={{ flex: 1 }}>
                <label>Key (camelCase)</label>
                <input
                  placeholder="newCheckout"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  required
                />
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
          <p className="api-info-desc">
            Use this endpoint to fetch toggle values for your application.
          </p>

          <div className="api-info-env-selector">
            <label>Environment:</label>
            <div className="api-env-tabs">
              {environments.map((env) => (
                <button
                  key={env.id.value}
                  className={`api-env-tab${selectedEnvKey === env.key ? " api-env-tab-active" : ""}`}
                  onClick={() => setSelectedEnvKey(env.key)}
                >
                  {env.name}
                </button>
              ))}
            </div>
          </div>

          <div className="api-info-method">
            <span className="api-method-badge">GET</span>
            <code className="api-url">{apiBaseUrl}{apiEndpoint}</code>
          </div>

          <div className="api-info-curl">
            <div className="api-info-curl-label">cURL</div>
            <pre className="api-code-block">
              <code>{`curl ${apiBaseUrl}${apiEndpoint} \\
  -H "x-api-key: ${selectedEnvApiKey ?? "<your-api-key>"}"`}</code>
            </pre>
          </div>

          <div className="api-info-curl">
            <div className="api-info-curl-label">Or via query parameter</div>
            <pre className="api-code-block">
              <code>{`curl "${apiBaseUrl}${apiEndpoint}?apiKey=${selectedEnvApiKey ?? "<your-api-key>"}"`}</code>
            </pre>
          </div>

          <div className="api-info-curl">
            <div className="api-info-curl-label">Response</div>
            <pre className="api-code-block">
              <code>{`{
${toggles.map((t) => {
  const stateKey = selectedEnv ? `${t.id.value}:${selectedEnv.id.value}` : "";
  const enabled = toggleStates.get(stateKey) ?? false;
  return `  "${t.key}": ${enabled}`;
}).join(",\n")}
}`}</code>
            </pre>
          </div>
        </div>
      )}

      {environments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">&#9729;</div>
            <p>Create environments first before managing toggles.</p>
          </div>
        </div>
      ) : toggles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#9881;</div>
          <p>No toggles yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ paddingLeft: "1.25rem" }}>Toggle</th>
                  {environments.map((env) => (
                    <th key={env.id.value} style={{ textAlign: "center", minWidth: 100 }}>
                      {env.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {toggles.map((toggle) => (
                  <tr key={toggle.id.value}>
                    <td style={{ paddingLeft: "1.25rem" }}>
                      <div style={{ fontWeight: 500 }}>{toggle.name}</div>
                      <span className="badge badge-key">{toggle.key}</span>
                    </td>
                    {environments.map((env) => {
                      const stateKey = `${toggle.id.value}:${env.id.value}`;
                      const isEnabled = toggleStates.get(stateKey) ?? false;
                      return (
                        <td key={env.id.value} style={{ textAlign: "center" }}>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) =>
                                handleToggle(
                                  toggle.id.value,
                                  env.id.value,
                                  e.target.checked
                                )
                              }
                            />
                            <span className="toggle-slider" />
                          </label>
                        </td>
                      );
                    })}
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
