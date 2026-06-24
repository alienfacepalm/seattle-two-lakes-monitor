#!/usr/bin/env node
/**
 * Single dev-server port guard for 2lakes root — port 3000 only.
 */
import net from "node:net";
import path from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEV_PORT = 3000;
const DEFAULT_PORT = DEV_PORT;
const DEFAULT_HOST = "127.0.0.1";

export { DEV_PORT };

export function resolveDevPort() {
  return DEV_PORT;
}

export function devServerUrl(port = resolveDevPort(), host = DEFAULT_HOST) {
  return `http://${host}:${port}/`;
}

function isPortFree(port, host = DEFAULT_HOST) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

function listListeningPids(port) {
  const pids = new Set();
  if (process.platform === "win32") {
    const out = execFileSync("netstat", ["-ano"], { encoding: "utf8" });
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      if (!line.includes(`:${port}`)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts.at(-1));
      if (Number.isInteger(pid) && pid > 0) pids.add(pid);
    }
    return [...pids];
  }

  try {
    const out = execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
      encoding: "utf8",
    });
    for (const line of out.split(/\r?\n/)) {
      const pid = Number(line.trim());
      if (Number.isInteger(pid) && pid > 0) pids.add(pid);
    }
  } catch {
    // lsof missing or no listeners
  }
  return [...pids];
}

function processName(pid) {
  try {
    if (process.platform === "win32") {
      const out = execFileSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], {
        encoding: "utf8",
      });
      const match = out.match(/^"([^"]+)"/);
      return match?.[1] ?? "unknown";
    }
    return execFileSync("ps", ["-p", String(pid), "-o", "comm="], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function killPid(pid) {
  if (process.platform === "win32") {
    execFileSync("taskkill", ["/PID", String(pid), "/F"], { stdio: "ignore" });
    return;
  }
  process.kill(pid, "SIGTERM");
}

export async function portStatus(port = resolveDevPort()) {
  const pids = listListeningPids(port);
  const free = pids.length === 0;
  const owners = pids.map((pid) => ({ pid, name: processName(pid) }));
  return {
    port,
    host: DEFAULT_HOST,
    url: devServerUrl(port),
    free,
    owners,
  };
}

function formatConflictReport(status, actor = "agent") {
  const ownerText =
    status.owners.length === 0
      ? "unknown process"
      : status.owners.map((o) => `${o.name} (PID ${o.pid})`).join(", ");
  return [
    "## Dev server port conflict",
    "",
    `- **Actor:** ${actor}`,
    `- **Requested port:** ${status.port}`,
    `- **URL:** ${status.url}`,
    `- **Status:** in use by ${ownerText}`,
    `- **Action taken:** none — run \`pnpm dev:port:free\` or \`pnpm dev\` (auto-reclaims)`,
  ].join("\n");
}

async function main() {
  const command = process.argv[2] ?? "status";
  const port = resolveDevPort();
  const status = await portStatus(port);

  switch (command) {
    case "check": {
      if (status.free) {
        console.log(`Port ${port} is free (${status.url})`);
        process.exit(0);
      }
      console.error(formatConflictReport(status));
      process.exit(1);
    }
    case "status": {
      console.log(JSON.stringify(status, null, 2));
      process.exit(status.free ? 0 : 1);
    }
    case "free": {
      if (status.free) {
        console.log(`Port ${port} already free`);
        process.exit(0);
      }
      for (const { pid, name } of status.owners) {
        console.log(`Stopping ${name} (PID ${pid}) on port ${port}`);
        killPid(pid);
      }
      const after = await portStatus(port);
      if (!after.free) {
        console.error(formatConflictReport(after, "dev-port free"));
        process.exit(1);
      }
      console.log(`Port ${port} is free (${after.url})`);
      process.exit(0);
    }
    case "report": {
      console.log(status.free ? `Port ${port} is free (${status.url})` : formatConflictReport(status));
      process.exit(status.free ? 0 : 1);
    }
    default:
      console.error(`Unknown command "${command}". Use: check | status | free | report`);
      process.exit(2);
  }
}

const isMain =
  process.argv[1] != null && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(2);
  });
}
