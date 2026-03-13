import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  api,
  type EnvironmentDTO,
  type FeatureToggleDTO,
} from "../api/client.js";

export function AppDetailPage() {
  const { appId } = useParams<{ appId: string }>();
  const [environments, setEnvironments] = useState<EnvironmentDTO[]>([]);
  const [toggles, setToggles] = useState<FeatureToggleDTO[]>([]);
  const [envName, setEnvName] = useState("");
  const [envKey, setEnvKey] = useState("");
  const [toggleName, setToggleName] = useState("");
  const [toggleKey, setToggleKey] = useState("");

  useEffect(() => {
    if (!appId) return;
    api.environments.list(appId).then(setEnvironments).catch(console.error);
    api.toggles.list(appId).then(setToggles).catch(console.error);
  }, [appId]);

  async function handleCreateEnv(e: React.FormEvent) {
    e.preventDefault();
    if (!appId) return;
    const env = await api.environments.create(appId, {
      name: envName,
      key: envKey,
    });
    setEnvironments((prev) => [...prev, env]);
    setEnvName("");
    setEnvKey("");
  }

  async function handleCreateToggle(e: React.FormEvent) {
    e.preventDefault();
    if (!appId) return;
    const toggle = await api.toggles.create(appId, {
      name: toggleName,
      key: toggleKey,
    });
    setToggles((prev) => [...prev, toggle]);
    setToggleName("");
    setToggleKey("");
  }

  async function handleToggle(toggleId: string, envId: string, enabled: boolean) {
    await api.toggles.setValue(toggleId, envId, enabled);
  }

  return (
    <div>
      <h2>App Detail</h2>

      <section style={{ marginBottom: "2rem" }}>
        <h3>Environments</h3>
        <form onSubmit={handleCreateEnv} style={{ marginBottom: "1rem" }}>
          <input
            placeholder="Environment name"
            value={envName}
            onChange={(e) => setEnvName(e.target.value)}
            required
          />
          <input
            placeholder="env-key"
            value={envKey}
            onChange={(e) => setEnvKey(e.target.value)}
            required
          />
          <button type="submit">Add Environment</button>
        </form>
        <ul>
          {environments.map((env) => (
            <li key={env.id.value}>
              {env.name} ({env.key})
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Feature Toggles</h3>
        <form onSubmit={handleCreateToggle} style={{ marginBottom: "1rem" }}>
          <input
            placeholder="Toggle name"
            value={toggleName}
            onChange={(e) => setToggleName(e.target.value)}
            required
          />
          <input
            placeholder="toggleKey"
            value={toggleKey}
            onChange={(e) => setToggleKey(e.target.value)}
            required
          />
          <button type="submit">Add Toggle</button>
        </form>

        {toggles.length === 0 ? (
          <p>No toggles yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Toggle</th>
                {environments.map((env) => (
                  <th key={env.id.value}>{env.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {toggles.map((toggle) => (
                <tr key={toggle.id.value}>
                  <td>
                    {toggle.name} <code>{toggle.key}</code>
                  </td>
                  {environments.map((env) => (
                    <td key={env.id.value} style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        onChange={(e) =>
                          handleToggle(
                            toggle.id.value,
                            env.id.value,
                            e.target.checked
                          )
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
