import { Events, Interaction, MessageFlags } from "discord.js";
import { client } from "../lib/client";
import logger from "../lib/logger";
import config from "../lib/config";

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction) {
  // ─── Slash Commands ────────────────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    try {
      logger.info(`Received command interaction: ${interaction.commandName} from ${interaction.user?.tag ?? interaction.user?.id}`);
    } catch {}

    // ✅ Restrict to allowed users (if list is non‑empty)
    const allowed = config.ALLOWED_USER_IDS;
    if (allowed.length > 0 && !allowed.includes(interaction.user.id)) {
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: "You are not allowed to use this bot", flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content: "You are not allowed to use this bot", flags: MessageFlags.Ephemeral });
        }
      } catch {}
      return;
    }

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      logger.error(`No command matching ${interaction.commandName} was found.`);
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: "This command is unavailable (command not found)", flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content: "This command is unavailable (command not found)", flags: MessageFlags.Ephemeral });
        }
      } catch (e) {
        logger.warn(`Failed to notify about missing command ${interaction.commandName}:`, e);
      }
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error: any) {
      logger.error(`Error executing command ${interaction.commandName}:`, error);
      // The interaction was already handled elsewhere (e.g. a duplicate bot
      // instance raced on it) or expired — replying would just fail again.
      if (error?.code === 10062 || error?.code === 40060) return;
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: "An error occurred while processing this command!", flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content: "An error occurred while processing this command!", flags: MessageFlags.Ephemeral });
        }
      } catch (e) {
        logger.warn(`Failed to send error reply for ${interaction.commandName}:`, e);
      }
    }
  }
}
