import db from "../lib/db";
import { ROBLOX_CHANNELS, RobloxChannel } from "../lib/constants";
import config from "../lib/config";
import { fetchJsonWithRetry } from "../lib/http";
import { sendUpdate, sendPreUpdate, sendHiddenUpdate, sendRevert } from "./alerts";


function getChannelUrl(channel: RobloxChannel) {
  return `${config.CLIENTSETTINGS_BASE}/v2/client-version/WindowsPlayer/channel/${channel}`;
}

function hasVersion(hash: string, channel: string) {
  return db
    .prepare(
      `
        SELECT 1
        FROM knownVersions
        WHERE hash = ?
        AND robloxChannel = ?
    `,
    )
    .get(hash, channel);
}

function addVersion(hash: string, channel: string) {
  db.prepare(
    `
        INSERT OR IGNORE INTO knownVersions (
            hash,
            robloxChannel,
            detectedAt
        )
        VALUES (?, ?, ?)
    `,
  ).run(hash, channel, Date.now());
}

function markReleased(hash: string) {
  db.prepare(
    `
        UPDATE knownVersions
        SET released = 1
        WHERE hash = ?
    `,
  ).run(hash);
}

function updateChannelState(channel: RobloxChannel, hash: string) {
  db.prepare(
    `
      INSERT INTO channelState (
        robloxChannel,
        currentVersion,
        previousVersion
      )
      VALUES (?, ?, NULL)
      ON CONFLICT(robloxChannel)
      DO UPDATE SET
        previousVersion = channelState.currentVersion,
        currentVersion = excluded.currentVersion
    `,
  ).run(channel, hash);
}

/**
 * If `hash` was previously detected on ZBeta (i.e. a future update has now
 * reached the public LIVE channel), record it as released. Marking is
 * idempotent — it must run on EVERY new LIVE version, not just the first
 * check after a fresh DB, or the ZBeta→LIVE release would never be recorded.
 */
function markReleasedIfZBetaDetected(hash: string) {
  const betaVersion = db
    .prepare(`SELECT 1 FROM knownVersions WHERE hash = ? AND robloxChannel = 'ZBeta'`)
    .get(hash);
  if (betaVersion) {
    markReleased(hash);
    console.log(`${hash} has been released`);
  }
}

async function checkChannel(channel: RobloxChannel) {
  const data = await fetchJsonWithRetry<{ clientVersionUpload?: string; version?: string }>(
    getChannelUrl(channel),
    { retries: 3, timeoutMs: 10000 },
  ).catch((e) => {
    // Let the caller log the error; rethrow so outer try/catch reports it consistently
    throw e;
  });

  if (!data) return;

  const hash = data.clientVersionUpload;
  const version = data.version;
  if (!hash) return;

  const currentState = db
    .prepare(
      `
        SELECT currentVersion, previousVersion
        FROM channelState
        WHERE robloxChannel = ?
      `,
    )
    .get(channel) as
    | {
        currentVersion: string;
        previousVersion: string | null;
      }
    | undefined;

  const versionExists = hasVersion(hash, channel);

  if (currentState && currentState.currentVersion === hash) {
    return;
  }

  if (channel === "LIVE" && currentState) {
    if (currentState.currentVersion === hash) {
      return;
    }

    const isRevert = currentState.previousVersion === hash;
    updateChannelState(channel, hash);

    if (versionExists && !isRevert) {
      return;
    }

    if (isRevert) {
      await sendRevert(hash, currentState.currentVersion, channel);
    } else {
      await sendUpdate(hash, channel, version);
    }

    if (!versionExists) {
      addVersion(hash, channel);
    }

    // A ZBeta build reaching LIVE means it has been officially released.
    markReleasedIfZBetaDetected(hash);

    return;
  }

  if (!versionExists) {
    addVersion(hash, channel);

    if (channel === "ZBeta") {
      await sendPreUpdate(hash, channel, version);
    } else if (channel === "Version-hidden") {
      await sendHiddenUpdate(hash, channel, version);
    } else {
      await sendUpdate(hash, channel, version);
      markReleasedIfZBetaDetected(hash);
    }
  }


  updateChannelState(channel, hash);
}

let monitoring = false;
export async function startMonitoring() {
  if (monitoring) {
    console.log("Update monitoring already running.");
    return;
  }

  monitoring = true;
  console.log("Update monitoring running.");

  async function check() {
    for (const channel of ROBLOX_CHANNELS) {
      try {
        await checkChannel(channel);
      } catch (error) {
        console.error(`Error while checking ${channel}:`, error);
      }
    }
  }

  while (monitoring) {
    await check();
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
}
