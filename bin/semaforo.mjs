#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import path from "node:path";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcFile = path.resolve(__dirname, "../apps/api/src/standalone.ts");
const distFile = path.resolve(__dirname, "../apps/api/dist/standalone.js");
const tsxBin = path.resolve(__dirname, "../node_modules/.bin/tsx");

const args = process.argv.slice(2);
const noWatch = args.includes("--no-watch");
const forwardArgs = args.filter((a) => a !== "--no-watch");

if (noWatch) {
  // Production: run compiled JS
  if (!fs.existsSync(distFile)) {
    console.error("Semaforo is not built yet. Run: npm run build");
    process.exit(1);
  }
  try {
    execFileSync("node", [distFile, ...forwardArgs], { stdio: "inherit" });
  } catch (err) {
    process.exit(err.status ?? 1);
  }
} else {
  // Development: hot reload via tsx watch
  if (!fs.existsSync(tsxBin)) {
    console.error("tsx not found. Run: npm install");
    process.exit(1);
  }
  try {
    execFileSync(tsxBin, ["watch", srcFile, ...forwardArgs], { stdio: "inherit" });
  } catch (err) {
    process.exit(err.status ?? 1);
  }
}
