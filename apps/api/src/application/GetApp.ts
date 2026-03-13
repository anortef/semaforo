import type { App, AppRepository } from "@semaforo/domain";

export class GetApp {
  constructor(private appRepository: AppRepository) {}

  async execute(id: string): Promise<App> {
    const app = await this.appRepository.findById(id);
    if (!app) {
      throw new Error("App not found");
    }
    return app;
  }
}
