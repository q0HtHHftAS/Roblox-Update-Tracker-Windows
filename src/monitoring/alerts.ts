import { client } from "../lib/client";
import db from "../lib/db";
import logger from "../lib/logger";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorBuilder,
  TextDisplayBuilder,
} from "discord.js";
import type { MessageCreateOptions } from "discord.js";
import {
  RDD_BASE,
  ROBLOX_ZBETA_BANNER_URL,
  ROBLOX_LIVE_BANNER_URL,
  ROBLOX_HIDDEN_BANNER_URL,
} from "../lib/constants";
import { interpolateV2Content, sendV2Message } from "../lib/v2Message";

type Alert = {
  channelId: string;
  customContent: string;
};

function getAlerts(channel: string, guildId?: string) {
  if (guildId) {
    return db
      .prepare(
        `
        SELECT channelId, customContent
        FROM alerts
        WHERE robloxChannel = ?
        AND guildId = ?
        AND enabled = 1
        `,
      )
      .all(channel, guildId) as Alert[];
  }
  return db
    .prepare(
      `
      SELECT channelId, customContent
      FROM alerts
      WHERE robloxChannel = ?
      AND enabled = 1
      `,
    )
    .all(channel) as Alert[];
}

function createTimestamp() {
  return `<t:${Math.floor(Date.now() / 1000)}:f>`;
}

export function createRobloxUpdateContainer(
  type: "live" | "pre" | "revert" | "hidden",
  hash: string,
  robloxChannel: string = "LIVE",
  previousVersion?: string,
): ContainerBuilder {
  const nowUnix = Math.floor(Date.now() / 1000);
  const bannerUrl =
    type === "hidden"
      ? ROBLOX_HIDDEN_BANNER_URL
      : robloxChannel === "LIVE"
        ? ROBLOX_LIVE_BANNER_URL
        : ROBLOX_ZBETA_BANNER_URL;

  const galleryItem = new MediaGalleryItemBuilder().setURL(bannerUrl);
  const gallery = new MediaGalleryBuilder().addItems(galleryItem);

  let headerContent = `### Live update detected!\n\nA new ROBLOX ${robloxChannel} version is out. Real will be updated shortly.`;

  if (type === "pre") {
    headerContent = `### A future Roblox update has been detected!\n\nThis is a future update, no need to worry about Roblox exploits being patched yet.`;
  } else if (type === "hidden") {
    headerContent = `### Hidden version detected!\n\nA new ROBLOX **Version-hidden** build was detected. This build is not public yet.`;
  } else if (type === "revert") {
    headerContent = `### 🔄 Update Reverted\n\nThe \`${robloxChannel}\` channel has reverted back to a previous version.`;
  }

  let detailsContent = `**Platform:** Windows\n**Roblox Version:** \`${hash}\` \n**Detected:** <t:${nowUnix}:F>`;
  if (type === "revert" && previousVersion) {
    detailsContent = `**Platform:** Windows\n**Reverted To:** \`${hash}\` \n**Previous Version:** \`${previousVersion}\` \n**Detected:** <t:${nowUnix}:F>`;
  }

  const rddUrl = `${RDD_BASE}/?channel=${robloxChannel}&binaryType=WindowsPlayer&version=${hash}`;
  const downloadBtn = new ButtonBuilder()
    .setLabel("Download")
    .setStyle(ButtonStyle.Link)
    .setURL(rddUrl);

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(downloadBtn);

  const footerText = new TextDisplayBuilder().setContent(
    `Powered by Diff Team | Channel : ${robloxChannel}`,
  );

  return new ContainerBuilder()
    .addMediaGalleryComponents(gallery)
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerContent))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(detailsContent))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(actionRow)
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(footerText);
}

async function sendToChannel(
  alert: Alert,
  payload: MessageCreateOptions,
  context?: { hash?: string; robloxChannel?: string; version?: string },
) {
  const channel = await client.channels.fetch(alert.channelId);
  if (!channel?.isTextBased() || !channel.isSendable()) return null;

  // Support placeholder interpolation in custom content
  const content = interpolateV2Content(alert.customContent, {
    hash: context?.hash,
    channel: context?.robloxChannel,
    version: context?.version,
    date: createTimestamp(),
  });

  // Components v2 messages cannot use the legacy `content` field — custom
  // content is injected as a TextDisplay above the components (shared helper).
  const sent = await sendV2Message(channel, payload.components ?? [], content);
  return sent ? channel : null;
}

async function sendContainerAlert(
  robloxChannel: string,
  container: ContainerBuilder,
  hash: string,
  guildId?: string,
  version?: string,
) {
  for (const alert of getAlerts(robloxChannel, guildId)) {
    try {
      const channel = await sendToChannel(
        alert,
        {
          components: [container],
          flags: MessageFlags.IsComponentsV2 as any,
        },
        { hash, robloxChannel, version },
      );
      if (channel) {
        const guildName = "guild" in channel && channel.guild ? channel.guild.name : "Unknown guild";
        const channelName = "name" in channel ? `#${channel.name}` : alert.channelId;
        logger.info(`Roblox update [${robloxChannel}] -> ${guildName} ${channelName}`);
      }
    } catch (e: any) {
      if (e?.code === 10003) {
        logger.warn(`Channel ${alert.channelId} not found — removing from alerts table`);
        db.prepare(`DELETE FROM alerts WHERE channelId = ?`).run(alert.channelId);
      } else {
        logger.error(`Failed to send alert to ${alert.channelId}, error: ${e}`);
      }
    }
  }
}

export async function sendPreUpdate(hash: string, robloxChannel: string, version?: string, guildId?: string) {
  const container = createRobloxUpdateContainer("pre", hash, robloxChannel);
  await sendContainerAlert(robloxChannel, container, hash, guildId, version);
}

export async function sendHiddenUpdate(hash: string, robloxChannel: string, version?: string, guildId?: string) {
  const container = createRobloxUpdateContainer("hidden", hash, robloxChannel);
  await sendContainerAlert(robloxChannel, container, hash, guildId, version);
}

export async function sendUpdate(hash: string, robloxChannel: string, version?: string, guildId?: string) {
  const container = createRobloxUpdateContainer("live", hash, robloxChannel);
  await sendContainerAlert(robloxChannel, container, hash, guildId, version);
}

export async function sendRevert(
  hash: string,
  previousVersion: string,
  robloxChannel: string,
  guildId?: string,
) {
  const container = createRobloxUpdateContainer("revert", hash, robloxChannel, previousVersion);
  await sendContainerAlert(robloxChannel, container, hash, guildId);
}
