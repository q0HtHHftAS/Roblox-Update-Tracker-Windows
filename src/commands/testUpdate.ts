import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { fetchJsonWithRetry } from "../lib/http";
import config from "../lib/config";
import { sendUpdate, sendPreUpdate, sendHiddenUpdate } from "../monitoring/alerts";

export const data = new SlashCommandBuilder()
  .setName("test")
  .setDescription("🧪 Test the Roblox alert system")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((option) =>
    option
      .setName("type")
      .setDescription("Choose the type of alert to test")
      .setRequired(true)
      .addChoices(
        { name: "🟥 Roblox Update — LIVE", value: "roblox-live" },
        { name: "🟦 Roblox Update — ZBeta", value: "roblox-zbeta" },
        { name: "🟪 Roblox Update — Version-hidden", value: "roblox-hidden" },
      ),
  );

async function fetchRealVersionData(channel: string): Promise<{ hash: string; version?: string }> {
  try {
    const data = await fetchJsonWithRetry<{ clientVersionUpload?: string; version?: string }>(
      `${config.CLIENTSETTINGS_BASE}/v2/client-version/WindowsPlayer/channel/${channel}`,
      { retries: 3, timeoutMs: 10000 },
    );

    if (data && data.clientVersionUpload) return { hash: data.clientVersionUpload, version: data.version };
  } catch (e) {
    console.error(`Failed to fetch real version for ${channel}:`, e);
  }
  return { hash: "version-145f189a6a974303", version: "0.732.23.7321040" };
}

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: "❌ You need Administrator permissions",
      flags: MessageFlags.Ephemeral,
    });
  }

  const type = interaction.options.getString("type", true);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (type === "roblox-live") {
    const { hash, version } = await fetchRealVersionData("LIVE");
    await sendUpdate(hash, "LIVE", version, interaction.guildId ?? undefined);
    return interaction.editReply(
      `✅ Sent a test **Roblox LIVE Update** alert with the real version \`${hash}\``,
    );
  }

  if (type === "roblox-zbeta") {
    const { hash, version } = await fetchRealVersionData("ZBeta");
    await sendPreUpdate(hash, "ZBeta", version, interaction.guildId ?? undefined);
    return interaction.editReply(
      `✅ Sent a test **Roblox ZBeta Update** alert with the real version \`${hash}\``,
    );
  }

  if (type === "roblox-hidden") {
    const { hash, version } = await fetchRealVersionData("Version-hidden");
    await sendHiddenUpdate(hash, "Version-hidden", version, interaction.guildId ?? undefined);
    return interaction.editReply(
      `✅ Sent a test **Roblox Version-hidden Update** alert with the real version \`${hash}\``,
    );
  }

  return interaction.editReply("❌ The selected test type was not found");
}
