import fs from "node:fs";
import path from "node:path";
import { createGzip, createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import type { ExportAll } from "./ExportAll.js";
import type { SystemSettingRepository } from "@semaforo/domain";

export interface BackupInfo {
  filename: string;
  size: number;
  createdAt: string;
}

export class ScheduledBackup {
  constructor(
    private exportAll: ExportAll,
    private settingRepository: SystemSettingRepository,
    private backupDir: string
  ) {}

  async execute(): Promise<BackupInfo> {
    fs.mkdirSync(this.backupDir, { recursive: true });

    const data = await this.exportAll.execute();
    const json = JSON.stringify(data, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `semaforo-backup-${timestamp}.json.gz`;
    const filePath = path.join(this.backupDir, filename);

    await pipeline(
      Readable.from(json),
      createGzip(),
      fs.createWriteStream(filePath)
    );

    const stat = fs.statSync(filePath);

    // Prune old backups
    await this.prune();

    return {
      filename,
      size: stat.size,
      createdAt: new Date().toISOString(),
    };
  }

  async prune(): Promise<number> {
    const retentionDays = await this.getRetentionDays();
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let deleted = 0;

    if (!fs.existsSync(this.backupDir)) return 0;

    const files = fs.readdirSync(this.backupDir)
      .filter((f) => f.startsWith("semaforo-backup-") && f.endsWith(".json.gz"));

    for (const file of files) {
      const filePath = path.join(this.backupDir, file);
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    }

    return deleted;
  }

  listBackups(): BackupInfo[] {
    if (!fs.existsSync(this.backupDir)) return [];

    return fs.readdirSync(this.backupDir)
      .filter((f) => f.startsWith("semaforo-backup-") && f.endsWith(".json.gz"))
      .map((filename) => {
        const stat = fs.statSync(path.join(this.backupDir, filename));
        return {
          filename,
          size: stat.size,
          createdAt: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async readBackup(filename: string): Promise<unknown> {
    const safeName = path.basename(filename);
    if (!safeName.startsWith("semaforo-backup-") || !safeName.endsWith(".json.gz")) {
      throw new Error("Invalid backup filename");
    }

    const filePath = path.join(this.backupDir, safeName);
    if (!fs.existsSync(filePath)) {
      throw new Error("Backup file not found");
    }

    const chunks: Buffer[] = [];
    await pipeline(
      fs.createReadStream(filePath),
      createGunzip(),
      async function* (source) {
        for await (const chunk of source) {
          chunks.push(Buffer.from(chunk));
        }
        yield Buffer.concat(chunks);
      }
    );

    return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  }

  async getScheduleMs(): Promise<number | null> {
    const setting = await this.settingRepository.findByKey("backupSchedule");
    if (!setting) return null;
    return parseScheduleToMs(setting.value);
  }

  private async getRetentionDays(): Promise<number> {
    const setting = await this.settingRepository.findByKey("backupRetention");
    if (!setting) return 7;
    const days = parseInt(setting.value, 10);
    return isNaN(days) || days < 1 ? 7 : days;
  }
}

export function parseScheduleToMs(schedule: string): number | null {
  switch (schedule) {
    case "1h": return 60 * 60 * 1000;
    case "12h": return 12 * 60 * 60 * 1000;
    case "24h": return 24 * 60 * 60 * 1000;
    default: {
      // Parse simple cron-like: treat as hours if numeric
      const hours = parseInt(schedule, 10);
      if (!isNaN(hours) && hours > 0) return hours * 60 * 60 * 1000;
      return null;
    }
  }
}
