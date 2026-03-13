import {
  createEnvironment,
  type Environment,
  type AppRepository,
  type EnvironmentRepository,
} from "@semaforo/domain";
import { v4 as uuid } from "uuid";

export class CreateEnvironment {
  constructor(
    private appRepository: AppRepository,
    private environmentRepository: EnvironmentRepository
  ) {}

  async execute(params: {
    appId: string;
    name: string;
    key: string;
  }): Promise<Environment> {
    const app = await this.appRepository.findById(params.appId);
    if (!app) {
      throw new Error("App not found");
    }

    const existing = await this.environmentRepository.findByAppIdAndKey(
      params.appId,
      params.key
    );
    if (existing) {
      throw new Error(
        `Environment with key "${params.key}" already exists in this app`
      );
    }

    const environment = createEnvironment({
      id: uuid(),
      appId: params.appId,
      name: params.name,
      key: params.key,
    });

    await this.environmentRepository.save(environment);
    return environment;
  }
}
