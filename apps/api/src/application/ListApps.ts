import type { App, AppRepository } from "@semaforo/domain";

export class ListApps {
  constructor(private appRepository: AppRepository) {}

  async execute(): Promise<App[]> {
    return this.appRepository.findAll();
  }
}
