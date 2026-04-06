import {
  createSecret,
  type Secret,
  type AppRepository,
  type SecretRepository,
} from "@semaforo/domain";
import { v4 as uuid } from "uuid";

export class CreateSecret {
  constructor(
    private appRepository: AppRepository,
    private secretRepository: SecretRepository
  ) {}

  async execute(params: {
    appId: string;
    key: string;
    description?: string;
  }): Promise<Secret> {
    const app = await this.appRepository.findById(params.appId);
    if (!app) {
      throw new Error("App not found");
    }

    const existing = await this.secretRepository.findByAppIdAndKey(
      params.appId,
      params.key
    );
    if (existing) {
      throw new Error(
        `Secret with key "${params.key}" already exists in this app`
      );
    }

    const secret = createSecret({
      id: uuid(),
      appId: params.appId,
      key: params.key,
      description: params.description,
    });

    await this.secretRepository.save(secret);
    return secret;
  }
}
