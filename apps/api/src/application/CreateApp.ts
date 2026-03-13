import { createApp, type App, type AppRepository } from "@semaforo/domain";
import { v4 as uuid } from "uuid";

export class CreateApp {
  constructor(private appRepository: AppRepository) {}

  async execute(params: {
    name: string;
    key: string;
    description?: string;
  }): Promise<App> {
    const existing = await this.appRepository.findByKey(params.key);
    if (existing) {
      throw new Error(`App with key "${params.key}" already exists`);
    }

    const app = createApp({
      id: uuid(),
      name: params.name,
      key: params.key,
      description: params.description,
    });

    await this.appRepository.save(app);
    return app;
  }
}
