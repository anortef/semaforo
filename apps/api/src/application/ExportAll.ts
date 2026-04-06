import type { AppRepository } from "@semaforo/domain";
import type { ExportApp, AppExportData } from "./ExportApp.js";

export interface AllExportData {
  apps: AppExportData[];
  exportedAt: string;
}

export class ExportAll {
  constructor(
    private appRepository: AppRepository,
    private exportApp: ExportApp
  ) {}

  async execute(): Promise<AllExportData> {
    const apps = await this.appRepository.findAll();
    const exports = await Promise.all(
      apps.map((app) => this.exportApp.execute(app.id.value))
    );
    return {
      apps: exports,
      exportedAt: new Date().toISOString(),
    };
  }
}
