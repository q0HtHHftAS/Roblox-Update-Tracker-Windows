import dotenv from "dotenv";
import path from "path";
dotenv.config({ quiet: true, path: path.join(__dirname, "../../.env") });

const {
  DISCORD_BOT_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID,
  CLIENTSETTINGS_BASE,
  ALLOWED_USER_IDS,
} = process.env;

// Parse allowed user IDs from env (comma‑separated list)
const allowedUserIds = ALLOWED_USER_IDS
  ? ALLOWED_USER_IDS.split(',').map((id) => id.trim()).filter(Boolean)
  : [];

if (!DISCORD_BOT_TOKEN || !DISCORD_CLIENT_ID || !CLIENTSETTINGS_BASE) {
  throw new Error("Required environment variables are missing!");
}

const DISCORD_GUILD_IDS = DISCORD_GUILD_ID
  ? DISCORD_GUILD_ID.split(",").map((id) => id.trim()).filter(Boolean)
  : [];

export default {
  DISCORD_BOT_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID,
  DISCORD_GUILD_IDS,
  CLIENTSETTINGS_BASE,
  ALLOWED_USER_IDS: allowedUserIds,
};
