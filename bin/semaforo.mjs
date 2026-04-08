#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcFile = path.resolve(__dirname, "../apps/api/src/standalone.ts");
const distFile = path.resolve(__dirname, "../apps/api/dist/standalone.js");
const tsxBin = path.resolve(__dirname, "../node_modules/.bin/tsx");

const args = process.argv.slice(2);

// --- Parse flags ---
const flags = new Set(args.filter((a) => a.startsWith("-")));
const isDaemon = flags.has("-d") || flags.has("--daemon");
const isStop = args.includes("stop");
const isStatus = args.includes("status");
const isLogs = args.includes("logs");
const noWatch = flags.has("--no-watch");

// Forward args: strip our meta-flags and subcommands
const metaFlags = new Set(["-d", "--daemon", "--no-watch"]);
const subcommands = new Set(["stop", "status", "logs"]);
const forwardArgs = args.filter((a) => !metaFlags.has(a) && !subcommands.has(a));

// --- Resolve runtime dir for PID/log files ---
// PID and log files always live next to the config file.
function resolveRuntimeDir() {
  const cfgIdx = args.indexOf("-c") !== -1 ? args.indexOf("-c") : args.indexOf("--config");
  if (cfgIdx >= 0 && args[cfgIdx + 1]) return path.dirname(path.resolve(args[cfgIdx + 1]));
  const ddIdx = args.indexOf("--data-dir");
  if (ddIdx >= 0 && args[ddIdx + 1]) return path.resolve(args[ddIdx + 1]);
  return path.join(process.env.HOME ?? "~", ".semaforo");
}

const runtimeDir = resolveRuntimeDir();
const pidFile = path.join(runtimeDir, "semaforo.pid");
const logFile = path.join(runtimeDir, "semaforo.log");

// --- Helpers ---
function readPid() {
  if (!fs.existsSync(pidFile)) return null;
  const pid = parseInt(fs.readFileSync(pidFile, "utf-8").trim(), 10);
  if (isNaN(pid)) return null;
  return pid;
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// --- Subcommands ---
if (isStop) {
  const pid = readPid();
  if (!pid || !isProcessRunning(pid)) {
    console.log("Semaforo is not running.");
    if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
    process.exit(0);
  }
  process.kill(pid, "SIGTERM");
  fs.unlinkSync(pidFile);
  console.log(`Semaforo stopped (PID ${pid}).`);
  process.exit(0);
}

if (isStatus) {
  const pid = readPid();
  if (!pid || !isProcessRunning(pid)) {
    console.log("Semaforo is not running.");
    if (pid && fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
    process.exit(1);
  }
  console.log(`Semaforo is running (PID ${pid}).`);
  console.log(`PID file: ${pidFile}`);
  console.log(`Log file: ${logFile}`);
  process.exit(0);
}

if (isLogs) {
  if (!fs.existsSync(logFile)) {
    console.log("No log file found.");
    process.exit(1);
  }
  // Follow mode: -f flag or default to tail
  const follow = flags.has("-f") || flags.has("--follow");
  if (follow) {
    try {
      execFileSync("tail", ["-f", logFile], { stdio: "inherit" });
    } catch { /* ctrl-c */ }
  } else {
    const lines = forwardArgs.find((a) => /^\d+$/.test(a)) ?? "50";
    try {
      execFileSync("tail", [`-${lines}`, logFile], { stdio: "inherit" });
    } catch (err) {
      process.exit(err.status ?? 1);
    }
  }
  process.exit(0);
}

// --- Daemon mode ---
if (isDaemon) {
  let bin, binArgs;
  if (noWatch) {
    if (!fs.existsSync(distFile)) {
      console.error("Semaforo is not built yet. Run: npm run build");
      process.exit(1);
    }
    bin = "node";
    binArgs = [distFile, ...forwardArgs];
  } else {
    if (!fs.existsSync(tsxBin)) {
      console.error("tsx not found. Run: npm install");
      process.exit(1);
    }
    bin = tsxBin;
    binArgs = ["watch", srcFile, ...forwardArgs];
  }

  const existingPid = readPid();
  if (existingPid && isProcessRunning(existingPid)) {
    console.error(`Semaforo is already running (PID ${existingPid}).`);
    process.exit(1);
  }

  fs.mkdirSync(runtimeDir, { recursive: true });
  const logFd = fs.openSync(logFile, "a");

  const child = spawn(bin, binArgs, {
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });

  fs.writeFileSync(pidFile, String(child.pid), "utf-8");
  child.unref();
  fs.closeSync(logFd);

  console.log(`Semaforo started in daemon mode (PID ${child.pid}).`);
  console.log(`Logs: ${logFile}`);
  console.log(`Stop: npx semaforo stop`);
  process.exit(0);
}

// --- Foreground mode ---
if (noWatch) {
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
