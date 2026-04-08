#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import path from "node:path";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const standalone = path.resolve(__dirname, "../apps/api/dist/standalone.js");

if (!fs.existsSync(standalone)) {
  console.error("Semaforo is not built yet. Run: npm run build");
  process.exit(1);
}

// Re-exec with node, forwarding all CLI args
try {
  execFileSync("node", [standalone, ...process.argv.slice(2)], { stdio: "inherit" });
} catch (err) {
  process.exit(err.status ?? 1);
}
