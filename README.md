# Roblox Update Tracker

This bot tracks Roblox client versions and the status of executors.
An executor is a third-party program that runs scripts in Roblox.
An embed is a formatted Discord message with title and fields.
When Roblox releases a new version, the bot sends an embed to each Discord channel that tracks that release channel.
When an executor changes status, the bot renames the status channels and sends an alert embed if you enabled alerts.

The bot provides the functions below:

- Poll clientsettings.roblox.com for the LIVE and ZBeta channels and detect new hashes, reverts, and future ZBeta releases.
- Poll the WEAO API each minute and update status channels and alert messages for each executor.
- Join a voice channel 24 hours per day and show the current Roblox version in the channel name.
- Watch honeypot channels and ban or time out any person who posts in the channels. A honeypot is a channel that traps spammers.
- Send a welcome mention and embed when a new member joins the server.

## Functions in Detail

The bot provides the functions below. Each function runs without manual work after you set the function up. You control each function with slash commands. A slash command is a typed command that starts with /.

- Monitor the Roblox LIVE and ZBeta channels for new versions.
- Detect new versions, reverts, and future ZBeta releases.
- Send Discord embeds with a Download button that links to RDD at https://rdd.weao.gg.
- Track Roblox executors through the WEAO API with alerts, voice status channels, and text status channels.
- Show the current Roblox version in a voice channel of the bot that stays online.
- Use honeypot rooms that ban or time out any person who types in the rooms.
- Send welcome notifications for new members through the Guild Members intent.
- Support custom message templates for each alert channel with {hash}, {channel}, {version}, and {date}.
- Support Discord slash commands for all setup with no manual database edits.
- Restrict bot use with the ALLOWED_USER_IDS allowlist.
- Limit spam with a short cooldown for each user and command pair through COMMAND_COOLDOWN_MS with default 5000. The ?ver command uses the same limit.
- Log unhandled rejections, uncaught exceptions, client errors, and session invalidation to the console and to a file. Send the errors to a developer webhook through ERROR_WEBHOOK_URL with throttling.
- Serve hot reads from a TTL cache in memory with write-through invalidation and reuse prepared statements to reduce SQLite work. A TTL cache is a temporary store that expires after a set time.

## Requirements

The host that runs the bot must meet the requirements below:

- Run Node.js 22.12 or later for @discordjs/voice.
- Have a Discord bot application. See Installation for the steps to create the application.
- Enable the Guild Members intent in the configuration of the bot and set ENABLE_GUILD_MEMBERS_INTENT to true to use joinalert.
- Grant the Ban Members permission to the bot to use protectroom.
- Grant the Manage Channels and Connect permissions to the bot in the target category. Use these permissions for voice and track voice channels.

## Installation

Complete the steps below on the host that runs the bot.
Do not commit the .env file to the repository. The .env file holds secrets.

1. Clone the repository:

```bash
git clone https://github.com/q0HtHHftAS/Roblox-Update-Tracker.git
cd RobloxUpdateTracker
```

2. Install dependencies:

```bash
npm install
```

3. Create the .env file:

```bash
cp .env.example .env
```

4. Edit the .env file with the values below. Each row names one variable and states if the variable is required.

| Variable | Required | Description |
|---|---|---|
| DISCORD_BOT_TOKEN | Required | Token of the bot. |
| DISCORD_CLIENT_ID | Required | Application ID of the bot. |
| DISCORD_GUILD_ID | Optional | IDs of guilds separated by commas for instant command registration. Leave the value empty to register commands globally. |
| ENABLE_GUILD_MEMBERS_INTENT | Optional | Set to true to enable the Guild Members intent for /joinalert. |
| ALLOWED_USER_IDS | Optional | IDs of users separated by commas. If the value is not empty, only the listed users can run slash commands. |
| CLIENTSETTINGS_BASE | Optional | Base address for Roblox clientsettings. Default is https://clientsettings.roblox.com. |
| COMMAND_COOLDOWN_MS | Optional | Minimum delay in ms between uses of the same command by the same user. Default is 5000. Set to 0 to turn off the limit. |
| COOLDOWN_MESSAGE_TTL_MS | Optional | Time in ms that the cooldown warning stays before the bot deletes the warning. Default is 5000. Set to 0 to keep the warning. |
| ERROR_WEBHOOK_URL | Optional | Discord webhook address where the bot posts an alert when an error occurs. Empty value means log-only mode. |
| LOG_TO_FILE / LOG_FILE | Optional | Append each log line to a text file. Defaults are true and bot.log. |

On each boot the bot deletes data of guilds where the bot is no longer a member.
The bot deletes alerts, executor tracking, voice channels, chat channels, join alerts, protect rooms, and allowlists for those guilds.
To remove a guild fully, remove the bot from the guild and restart the bot.
This cleanup runs only when the bot is a member of at least one guild at startup.

5. Register slash commands:

```bash
npm run register-commands
```

If DISCORD_GUILD_ID has values, the bot registers commands for each listed guild at once.
If DISCORD_GUILD_ID is empty, the bot registers commands globally and registration takes up to one hour.

6. Build and start the bot:

```bash
npm run build
npm run start
```

For development with auto-reload, run the command below:

```bash
npm run dev
```

For production with pm2, run the commands below:

```bash
npm run pm2:start
pm2 save
```

The pm2:start script uses pm2 startOrReload with ecosystem.config.js and reloads the current bot instead of starting a second bot.
Run pm2 save one time after each change to the process list so pm2 resurrect restores one instance.
To stop the bot fully, run the command below:

```bash
pm2 delete roblox-bot
```

## Roblox Alert Commands

All commands in this section need administrator rights.
The commands control update alerts for Roblox release channels.
Run the commands in the Discord server where you want the alerts.

### /robloxalert add

You need administrator rights to run this command.
The command enables Roblox update alerts for the server.
By default the bot sends the alert to the current text channel.
To send the alert to a different channel, set discord_channel.
To add custom text before the embed, set message with the placeholders.

The command accepts the parameters below:

- Set roblox_channel to LIVE or ZBeta (required).
- Set discord_channel to the Discord channel that receives the alerts (uses the current channel by default).
- Set message to the custom text sent before the embed with {hash}, {channel}, {version}, and {date} (optional).

Example:

```
/robloxalert add roblox_channel:LIVE message:@everyone
```

### /robloxalert remove

You need administrator rights to run this command.
The command stops Roblox update alerts for the server.
By default the command targets the current channel.
To stop alerts in a different channel, set discord_channel.

Example:

```
/robloxalert remove roblox_channel:LIVE
```

### /robloxalert list

Any member can run this command.
The command lists each alert set in the server.
The list shows the Roblox channel and the Discord channel for each alert.
Use /robloxalert add to add a missing alert and use /robloxalert remove to delete an alert.

### /ver

Any member can run this command.
The command shows the current clientVersionUpload hash for a Roblox channel.
The hash is the upload ID that Roblox assigns to the client build.
If you omit the channel, the bot shows the LIVE channel.

The command accepts the parameters below:

- Set channel to LIVE or ZBeta (uses LIVE by default).

## Executor Track Commands

All commands in this section need administrator rights.
The commands track executors through the WEAO API.
The bot updates the display when the version or the status of an executor changes.

### /ex track add

You need administrator rights to run this command.
The command tracks one Roblox executor in the server.
The bot uses the executor name from the WEAO API as the display name.
The command supports voice, chat, embed, and alert display modes.

Voice mode creates a voice channel in the set category. The bot renames the channel to show the status of the executor.
Chat mode creates a text channel and renames the channel in the same way.
Embed mode sends a rich embed with the status, the version, and the Roblox version. The embed updates on a set interval with default 1m.
Alert mode sends an embed each time the executor releases a new version.

The command accepts the parameters below:

- Set display to voice, chat, embed, or alert (required).
- Set executor to the name from the WEAO API (required).
- Set channel to the text channel for alert or embed mode.
- Set category to the category where the bot creates the channel for voice or chat mode.
- Set content to the message template for alert mode with {hash}, {channel}, and {date} (optional).
- Set interval to the auto-update interval for embed mode (optional). Use values such as 30s, 1m, 5m, or 1h with minimum 10s, maximum 1h, and default 1m.

### /ex track remove

You need administrator rights to run this command.
The command stops tracking for one executor.
The bot also deletes the channel that the bot created for the tracker.
The command affects only the current server.

The command accepts the parameters below:

- Set display to voice, chat, embed, or alert (required).
- Set executor to the name from the WEAO API (required).
- Set channel to narrow removal to one channel for alert or embed mode (optional).

### /ex track edit

You need administrator rights to run this command.
The command changes the content or the embed interval of a tracker that already exists.
The command changes only the parameters that you provide.
The command works for alert, embed, voice, and chat trackers.

The command accepts the parameters below:

- Set executor to the name from the WEAO API (required).
- Set content to the new message template for alert or embed mode (optional).
- Set interval to the new auto-update interval for embed mode (optional).

### /ex track list

You need administrator rights to run this command.
The command lists each executor tracker set in the server.
The list groups trackers by display mode.
Use /ex track add to add a missing tracker and use /ex track remove to delete a tracker.

### /ex track refresh

You need administrator rights to run this command.
The command refreshes each executor status channel and chat channel at once.
The command reads the latest state from the database before the refresh.
Use this command after you change permissions or categories.

## Bot Voice and Chat Commands

The commands in this section control the voice channel and the text channel of the bot.
The voice channel is a channel that the bot joins 24 hours per day.
The chat channel is a text channel where the channel name mirrors the Roblox version.

### /ex voice add

You need administrator rights to run this command.
The command sets the voice channel where the bot stays online.
The bot joins the channel 24 hours per day.
If the bot fails to join, the bot retries one time per 15 minutes for each guild.

The command accepts the parameters below:

- Set mode to custom for a fixed name or to roblox-version to mirror clientVersionUpload (required).
- Set channel to a voice channel that already exists for the bot to use (optional).
- Set category to a category where the bot creates a new voice channel (optional).
- Set display_name to the name to show in custom mode (optional).
- Set roblox_channel to LIVE or ZBeta in roblox-version mode with default LIVE (optional).

Provide channel or category. The bot needs one of the two values to find or create the channel.

### /ex voice remove

You need administrator rights to run this command.
The command stops tracking for the voice channel of the bot.
The bot leaves the channel and deletes the channel from the server.
The command affects only the current server.

### /ex voice list

You need administrator rights to run this command.
The command shows the current voice configuration of the bot for the server.
The output includes the mode, the channel, and the Roblox channel.
Use /ex voice add to change the values and use /ex voice remove to delete the values.

### /ex voice refresh

You need administrator rights to run this command.
The command refreshes the name and the connection of the voice channel one time.
The command reads the current Roblox version before the refresh.
Use this command after you change the mode or the channel.

### /ex chat add

You need administrator rights to run this command.
The command sets a text channel where the channel name mirrors the Roblox version.
The channel name updates on each monitoring tick when the Roblox version changes.
The default tick runs each 60 seconds.

The command accepts the parameters below:

- Set mode to custom for a fixed name or to roblox-version to mirror clientVersionUpload (required).
- Set channel to a text channel that already exists for the bot to use (optional).
- Set category to a category where the bot creates a new text channel (optional).
- Set display_name to the name to show in custom mode (optional).
- Set roblox_channel to LIVE or ZBeta in roblox-version mode with default LIVE (optional).

Provide channel or category. The bot needs one of the two values to find or create the channel.

### /ex chat remove

Any member with administrator rights can run this command.
The command stops tracking and deletes the chat channel of the bot for the server.
The command affects only the current server.
Use /ex chat add to create a new chat channel after removal.

### /ex chat list

Any member with administrator rights can run this command.
The command shows the current chat configuration of the bot for the server.
The output includes the mode, the channel, and the Roblox channel.
Use /ex chat add to change the values and use /ex chat remove to delete the values.

### /ex chat refresh

Any member with administrator rights can run this command.
The command refreshes the name of the chat channel of the bot one time.
The command reads the current Roblox version before the refresh.
Use this command after you change the mode or the channel.

## Status Commands

All commands in this section need administrator rights.
The commands control the rotating presence of the bot.
Presence is status text shown on the bot profile.

### /status add

You need administrator rights to run this command.
The command adds one message to the rotating presence of the bot.
You can add more than one message and the bot shows each message in turn.
Each message stays for the set interval before the bot shows the next message.

The command accepts the parameters below:

- Set text to the presence text (required).
- Set url to the stream address with default https://www.twitch.tv/roblox (optional).
- Set custom to the custom status shown on the profile card (optional).
- Set interval to the display time such as 30s, 1m, 5m, or 1h with minimum 5s and default 1m (optional).

### /status remove

You need administrator rights to run this command.
The command deletes each status message and removes the presence of the bot.
No status shows until you run /status add again.
Use /status list before removal if you want to keep a copy of the texts.

### /status list

You need administrator rights to run this command.
The command shows each status message with rotation interval and stream address.
The list covers all messages set in the server.
Use /status add to add a message and use /status remove to delete all messages.

### /status refresh

You need administrator rights to run this command.
The command applies the set status of the bot at once.
The command helps after restarts or failed presence updates.
Use /status list to make sure that the values are correct before the refresh.

## Protect Room Commands

All commands in this section need administrator rights.
The commands control honeypot rooms that trap spammers.
Guild owners and administrators are exempt from the actions.

### /protectroom setup

You need administrator rights to run this command.
The command marks the current text channel as a honeypot.
The first message from any member without administrator rights starts the action below.
The bot deletes each message by that user from the last minute across all channels. The bot then bans the user or times out the user for the set duration with default 60 minutes.

The command accepts the parameters below:

- Set action to ban or timeout (required).
- Set timeout_minutes to the duration in minutes from 1 to 40320 with default 60 for timeout action (optional).

Do not post in a honeypot channel. The bot will ban or time out your account.

### /protectroom remove

You need administrator rights to run this command.
The command removes protection from the current channel.
Members can post in the channel again without automatic action.
Use /protectroom view to make sure that the removal worked.

### /protectroom view

You need administrator rights to run this command.
The command shows the protection status of the current channel.
The output states if the channel is protected and which action applies.
Use /protectroom setup to change the action and use /protectroom remove to stop protection.

## Join Alert and Utility Commands

The commands in this section cover welcome messages and setup helpers.
Some commands need administrator rights and some commands are open to all members.
Run /help in Discord to see the full list with short texts.

### /joinalert add

You need administrator rights to run this command.
The command enables a welcome notification when a new member joins the server.
The bot sends a mention with an embed to the set channel.
To use this command, enable the Guild Members intent in the configuration of the bot. Then set ENABLE_GUILD_MEMBERS_INTENT to true in the .env file.

Example:

```
/joinalert add message:Welcome to the server!
```

### /joinalert remove

You need administrator rights to run this command.
The command stops the join notification for the server.
New members no longer trigger a message.
Use /joinalert add to enable the notification again.

### /joinalert list

You need administrator rights to run this command.
The command shows the join channel and the message set for the server.
The output reflects the current database values.
Use /joinalert add to change the message and use /joinalert remove to stop the messages.

### /config

You need administrator rights to run this command.
The command shows an embed with a summary of each value set in the server.
The bot also deletes database rows that point to channels that no longer exist.
Use this command to review the full setup in one place.

### /help

Any member can run this command.
The command shows each slash command with a short text.
The list covers all commands available in the server.
Use the specific list commands such as /robloxalert list for full details.

### /test

You need administrator rights to run this command.
The command sends a sample alert to make sure that the configuration works.
Use this command after you set channels to make sure that delivery works.
The command needs one type value and uses real data where available.

The command accepts the parameters below:

- Set type to roblox-live, roblox-zbeta, or executor-alert (required).

The embed uses the current real clientVersionUpload for the Roblox types.
The executor type uses the first matching WEAO entry or a sample entry.

## How the Bot Works

This section explains the polling loops of the bot.
Each loop runs on a fixed interval and writes state to the local database.
Read this section before you change intervals or debug missed alerts.

### Roblox Update Loop

The bot polls clientsettings.roblox.com/v2/client-version/WindowsPlayer/channel/{LIVE,ZBeta} each 10 seconds.
If a channel fails 6 polls in a row, the bot slows that channel to one poll per minute until the channel recovers.
A new hash on LIVE triggers a red embed with title Roblox Update Detected.
A new hash on ZBeta triggers a yellow embed for a future update. When the same hash later appears on LIVE, the bot marks the hash as released.
If the bot sees the previous currentVersion again, the bot sends an orange embed for Update Reverted.
Each embed includes a Download button that links to https://rdd.weao.gg/?channel=...&version=....

### Executor Monitoring Loop

The bot polls https://whatexpsare.online/api/status/exploits each 60 seconds.
For each executor with alerts, the bot compares version and updateStatus against executorLastState in the database.
If the bot finds a new working version, the bot sends an embed with the changelog to each subscribed channel when the changelog is present.
The bot renames voice and text status channels to show updateStatus.
A separate scheduler refreshes embed status rows and each row has its own intervalMs set through /ex track add or /ex track edit.
A light tick runs each 5 seconds to refresh each due row so each embed updates on its own.

### Bot Online Voice

If you set /ex voice, the bot joins the set voice channel 24 hours per day and renames the channel for the set mode.
Failed joins slow to one attempt per 15 minutes for each guild.
Voice error events destroy the connection and this behavior prevents process crashes.
Read the logs if the bot does not stay in the channel.

### Protected Rooms

The bot logs each message to messageLog with TTL 2 minutes and deletes old rows each 5 minutes.
On a message in a protected channel, the bot finds messages of the user from the last minute and deletes all found messages.
The bot then bans or times out the user.
Guild owners and administrators are exempt from the actions.

## Message Placeholders

You can use the placeholders below in custom messages.
The bot replaces each placeholder when the bot sends the message.
Use the exact text with braces.

| Placeholder | Replaced with |
|---|---|
| {hash} | The Roblox clientVersionUpload or the executor version. |
| {channel} | The Roblox channel name such as LIVE or ZBeta. |
| {version} | The numeric Roblox version when available. |
| {date} | A Discord timestamp such as <t:...:f> or <t:...:F> for executor alerts. |

## Data Storage

The bot stores state in a local SQLite database in data.db with WAL mode.
The schema and the migrations live in src/lib/db.ts.
Each channel that the bot manages heals itself and the bot deletes the reference on the next pass if you deleted the channel manually.
The bot prunes knownVersions on boot and each 6 hours and keeps rows younger than 90 days with maximum 500 rows for each channel.
The channelState table also keeps the numeric Roblox version next to each hash.

## Development

Run the bot in development mode with auto-reload with the command below:

```bash
npm run dev
```

To run lint and typecheck, run the command below:

```bash
npm run build
```

Tests live in tests and run with the built-in Node test runner through tsx with the command below:

```bash
npm test
```

Useful paths are listed below:

- Open src/index.ts for bootstrap.
- Open src/monitoring/ for update loops.
- Open src/commands/ for slash command handlers.
- Open src/lib/db.ts for schema and migrations.

## Notes

Pull requests and issues belong on GitHub.
Do not commit the .env file to the repository. The file holds secrets and the provided .gitignore already excludes the file.
If you self-host and the bot fails to join the voice channel, read the logs. Repeated join failures start a 15 minute cooldown for each guild.
Make sure that the file is correct before you push.

## License

This project uses the MIT license.
See LICENSE for the full text.
When you use the bot, you accept the risk.
