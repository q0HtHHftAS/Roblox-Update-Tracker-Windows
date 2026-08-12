import { Client, Collection, GatewayIntentBits, Options } from "discord.js";

const intents = [
  // Only the Guilds intent is needed: alert channels are configured per guild
  // and fetched through the guild/channel cache. No message content or member
  // data is required for Roblox alerts.
  GatewayIntentBits.Guilds,
];

export const client = new Client({
  intents,
  sweepers: {
    ...Options.DefaultSweeperSettings,
    // Keep recently-fetched messages, drop anything older than 10 minutes.
    messages: { interval: 600, lifetime: 600 },
    invites: { interval: 600, lifetime: 600 },
    // Everything else is re-fetchable from the API on demand — sweep hard.
    applicationCommands: { interval: 600, filter: () => () => true },
    bans: { interval: 600, filter: () => () => true },
    emojis: { interval: 600, filter: () => () => true },
    entitlements: { interval: 600, filter: () => () => true },
    reactions: { interval: 600, filter: () => () => true },
    stageInstances: { interval: 600, filter: () => () => true },
    stickers: { interval: 600, filter: () => () => true },
    threadMembers: { interval: 600, filter: () => () => true },
    users: { interval: 600, filter: () => () => true },
  },
});

client.commands = new Collection();
