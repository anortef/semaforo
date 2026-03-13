import type { App } from "../entities/App.js";

export interface AppRepository {
  findById(id: string): Promise<App | null>;
  findByKey(key: string): Promise<App | null>;
  findAll(): Promise<App[]>;
  save(app: App): Promise<void>;
  delete(id: string): Promise<void>;
}
