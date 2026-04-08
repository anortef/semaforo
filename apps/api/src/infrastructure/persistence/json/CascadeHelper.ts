import type { JsonFileStore } from "./JsonFileStore.js";
import type {
  App, Environment, FeatureToggle, ToggleValue,
  Secret, SecretValue, ApiKey, AppMember, RequestCount,
} from "@semaforo/domain";

export interface CascadeStores {
  apps: JsonFileStore<App>;
  environments: JsonFileStore<Environment>;
  toggles: JsonFileStore<FeatureToggle>;
  toggleValues: JsonFileStore<ToggleValue>;
  secrets: JsonFileStore<Secret>;
  secretValues: JsonFileStore<SecretValue>;
  apiKeys: JsonFileStore<ApiKey>;
  members: JsonFileStore<AppMember>;
  requestCounts: JsonFileStore<RequestCount>;
}

export class CascadeHelper {
  constructor(private stores: CascadeStores) {}

  async cascadeDeleteApp(appId: string): Promise<void> {
    // Delete environments (each cascades its own children)
    const envs = this.stores.environments.filter((e) => e.appId === appId);
    for (const env of envs) {
      await this.cascadeDeleteEnvironment(env.id.value);
    }
    await this.stores.environments.remove((e) => e.appId === appId);

    // Delete toggles and their values
    const toggles = this.stores.toggles.filter((t) => t.appId === appId);
    for (const toggle of toggles) {
      await this.stores.toggleValues.remove((v) => v.toggleId === toggle.id.value);
    }
    await this.stores.toggles.remove((t) => t.appId === appId);

    // Delete secrets and their values
    const secrets = this.stores.secrets.filter((s) => s.appId === appId);
    for (const secret of secrets) {
      await this.stores.secretValues.remove((v) => v.secretId === secret.id.value);
    }
    await this.stores.secrets.remove((s) => s.appId === appId);

    // Delete members
    await this.stores.members.remove((m) => m.appId === appId);
  }

  async cascadeDeleteEnvironment(envId: string): Promise<void> {
    await this.stores.toggleValues.remove((v) => v.environmentId === envId);
    await this.stores.secretValues.remove((v) => v.environmentId === envId);
    await this.stores.apiKeys.remove((k) => k.environmentId === envId);
    await this.stores.requestCounts.remove((r) => r.environmentId === envId);
  }

  async cascadeDeleteToggle(toggleId: string): Promise<void> {
    await this.stores.toggleValues.remove((v) => v.toggleId === toggleId);
  }

  async cascadeDeleteSecret(secretId: string): Promise<void> {
    await this.stores.secretValues.remove((v) => v.secretId === secretId);
  }
}
