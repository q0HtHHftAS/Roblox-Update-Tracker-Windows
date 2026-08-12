import { Events } from "discord.js";
import { startMonitoring } from "../monitoring";

export const name = Events.ClientReady;
export const once = true;

export async function execute(...args: any[]) {
  try {
    console.log("Logged into Discord bot!");
    const client = args[0];
    try {
      console.log(`Bot user: ${client?.user?.tag ?? 'unknown'} (${client?.user?.id ?? 'unknown id'})`);
    } catch {}

    startMonitoring();
  } catch (e) {
    console.error('Error in ClientReady handler:', e);
  }
}
