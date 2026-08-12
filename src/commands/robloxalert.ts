import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";
import { ROBLOX_CHANNELS } from "../lib/constants";
import db from "../lib/db";

export const data = new SlashCommandBuilder()
  .setName("robloxalert")
  .setDescription("📢 Manage Roblox update alerts")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("➕ Enable alerts in this channel")
      .addStringOption((option) =>
        option
          .setName("channel")
          .setDescription("The Roblox channel to track")
          .setRequired(true)
          .addChoices(
            ...ROBLOX_CHANNELS.map((channel) => ({
              name: channel,
              value: channel,
            })),
          ),
      )
      .addStringOption((option) =>
        option
          .setName("message")
          .setDescription("Message before the embed (e.g. @everyone) — optional")
          .setRequired(false),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove")
      .setDescription("➖ Disable alerts in this channel")
      .addStringOption((option) =>
        option
          .setName("channel")
          .setDescription("The Roblox channel to disable alerts for")
          .setRequired(true)
          .addChoices(
            ...ROBLOX_CHANNELS.map((channel) => ({
              name: channel,
              value: channel,
            })),
          ),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("list").setDescription("📋 View all alerts configured in this server"),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: "❌ You need Administrator permissions to manage alerts",
      flags: MessageFlags.Ephemeral,
    });
  }

  const subcommand = interaction.options.getSubcommand();
  if (!interaction.guildId || !interaction.channelId) {
    return interaction.reply({
      content: "❌ This command can only be used in a server",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (subcommand === "add") {
    const channel = interaction.options.getString("channel", true);
    const message = interaction.options.getString("message") ?? "";

    const botMember = interaction.guild?.members.me;
    if (!botMember) {
      return interaction.reply({
        content: "❌ Could not check the bot's permissions in this channel",
        flags: MessageFlags.Ephemeral,
      });
    }

    const guildChannel = interaction.guild.channels.cache.get(
      interaction.channelId,
    );

    if (!guildChannel || !guildChannel.isTextBased()) {
      return interaction.reply({
        content: "❌ This command can only be used in a text channel",
        flags: MessageFlags.Ephemeral,
      });
    }

    const permissions = guildChannel.permissionsFor(botMember);
    if (
      !permissions?.has(PermissionFlagsBits.ViewChannel) ||
      !permissions?.has(PermissionFlagsBits.SendMessages)
    ) {
      return interaction.reply({
        content:
          "❌ The bot does not have **View Channel** and **Send Messages** permissions in this channel. Grant them before enabling alerts.",
        flags: MessageFlags.Ephemeral,
      });
    }

    db.prepare(
      `
      INSERT INTO alerts (
        channelId,
        guildId,
        robloxChannel,
        customContent
      )
      VALUES (?, ?, ?, ?)
      ON CONFLICT(channelId, robloxChannel)
      DO UPDATE SET
        customContent = excluded.customContent,
        enabled = 1
    `,
    ).run(interaction.channelId, interaction.guildId, channel, message);

    return interaction.reply({
      content: `✅ Enabled alerts for **${channel}** in this channel`,
      flags: MessageFlags.Ephemeral,
    });
  }

  if (subcommand === "remove") {
    const channel = interaction.options.getString("channel", true);

    const result = db
      .prepare(
        `
      DELETE FROM alerts
      WHERE channelId = ?
      AND robloxChannel = ?
    `,
      )
      .run(interaction.channelId, channel);

    return interaction.reply({
      content: result.changes
        ? `✅ Disabled alerts for **${channel}** in this channel`
        : "ℹ️ No alerts are configured in this channel",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (subcommand === "list") {
    const alerts = db
      .prepare(
        `
      SELECT channelId, robloxChannel, customContent
      FROM alerts
      WHERE guildId = ?
      AND enabled = 1
    `,
      )
      .all(interaction.guildId) as {
      channelId: string;
      robloxChannel: string;
      customContent: string;
    }[];

    if (alerts.length === 0) {
      return interaction.reply({
        content: "ℹ️ No alerts have been configured yet",
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      content: alerts
        .map(
          (alert) =>
            `• **${alert.robloxChannel}** → <#${alert.channelId}>${alert.customContent ? ` (message: ${alert.customContent})` : ""}`,
        )
        .join("\n"),
      flags: MessageFlags.Ephemeral,
    });
  }
}
