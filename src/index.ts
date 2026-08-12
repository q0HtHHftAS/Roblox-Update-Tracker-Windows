import fs from "fs";
import path from "path";
import { client } from "./lib/client";
import logger from "./lib/logger";
import config from "./lib/config";
import { loadCommands } from "./commands";
import { loadEvents } from "./events";

// ─── Single-instance lock ───────────────────────────────────────────────────
// Discord delivers each interaction to exactly one gateway connection. If two
// instances of this bot connect with the same token, they race on the same
// interactions: one acknowledges it and the other fails with "Unknown
// interaction" (10062) / "already acknowledged" (40060). Refuse to start when
// another instance is already running instead.
const LOCK_FILE = path.join(__dirname, "..", ".bot.lock");

let lockFd: number | undefined;

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireLock(): boolean {
  try {
    lockFd = fs.openSync(LOCK_FILE, "wx");
    fs.writeSync(lockFd, String(process.pid));
    return true;
  } catch (error: any) {
    if (error?.code !== "EEXIST") throw error;
    // A lock file already exists — is the owner still running?
    let ownerPid = 0;
    try {
      ownerPid = Number(fs.readFileSync(LOCK_FILE, "utf8"));
    } catch {
      // Unreadable/corrupt lock — treat as stale.
    }
    if (ownerPid > 0 && isProcessAlive(ownerPid)) {
      logger.error(
        `Another instance of the bot is already running (PID ${ownerPid}). Stop it first, then start again.`,
      );
      return false;
    }
    // Stale lock left by a crashed/killed instance — remove it and try once more.
    try {
      fs.unlinkSync(LOCK_FILE);
    } catch {
      // ignore
    }
    return acquireLock();
  }
}

function releaseLock() {
  try {
    if (lockFd !== undefined) {
      fs.closeSync(lockFd);
      lockFd = undefined;
    }
    fs.unlinkSync(LOCK_FILE);
  } catch {
    // ignore
  }
}

// ─── Global crash safety net ────────────────────────────────────────────────
// A long-running bot on a flaky network must not die from a single unhandled
// promise rejection (Discord REST / gateway internals all reject under DNS
// failures and connect timeouts). Log the stack so the next failure is a
// breadcrumb instead of a silent death, and keep the process alive for
// recoverable rejections.
process.on("unhandledRejection", (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error("Unhandled promise rejection:", error);
});

// Synchronous uncaught exceptions leave the process in an unknown state, so
// unlike rejections we exit — but only after logging the full stack, and only
// after a tight burst proves the state is corrupt. Single sporadic exceptions
// are logged and the bot keeps serving.
let lastUncaughtAt = 0;
let uncaughtBurst = 0;

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error);
  const now = Date.now();
  if (now - lastUncaughtAt < 10_000) {
    uncaughtBurst++;
  } else {
    uncaughtBurst = 0;
  }
  lastUncaughtAt = now;
  if (uncaughtBurst >= 3) {
    logger.error("Too many uncaught exceptions in a short window — exiting for a clean restart.");
    releaseLock();
    process.exit(1);
  }
});

// ─── Graceful shutdown (clean PM2 restarts) ────────────────────────────────
let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("Shutting down...");
  try {
    client.destroy();
  } catch {
    // ignore
  }
  releaseLock();
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Login with retry + backoff. The host network can be unreliable (DNS
 * ENOTFOUND for discord.com), so a transient login failure must not crash the
 * bot — but an invalid token will never succeed and should fail fast.
 */
async function loginWithRetry() {
  let attempt = 0;
  for (;;) {
    try {
      await client.login(config.DISCORD_BOT_TOKEN);
      return;
    } catch (error: any) {
      attempt++;
      // Never recoverable — do not retry forever.
      if (error?.code === "TokenInvalid" || error?.code === 4004 || error?.code === "DisallowedIntents") {
        throw error;
      }
      const delayMs = Math.min(60_000, 5_000 * Math.pow(2, Math.min(attempt - 1, 4)));
      logger.error(`Login failed (attempt ${attempt}), retrying in ${delayMs / 1000}s:`, error);
      await sleep(delayMs);
    }
  }
}

async function start() {
  if (!acquireLock()) {
    process.exit(1);
  }
  const commands = await loadCommands();

  logger.info(`Loaded ${Object.keys(commands).length} commands: ${Object.keys(commands).join(', ')}`);

  for (const [name, command] of Object.entries(commands)) {
    client.commands.set(name, command);
  }

  const events = await loadEvents();
  for (const event of events) {
    if (event.once) {
      client.once(event.name, (...args: any[]) => event.execute(...args));
    } else {
      client.on(event.name, (...args: any[]) => event.execute(...args));
    }
  }

  logger.info("Connecting to Discord...");
  await loginWithRetry();
}

start().catch((error) => {
  logger.error("Fatal error during startup:", error);
  process.exit(1);
});
