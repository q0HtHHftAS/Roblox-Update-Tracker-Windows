# Roblox Update Tracker

A standalone Discord bot that monitors Roblox client versions and sends update
notifications to configured Discord channels.

## Features

- Tracks the Roblox `LIVE`, `ZBeta`, and `Version-hidden` channels.
- Sends notifications when a version changes or is reverted.
- Provides `/robloxalert add`, `/robloxalert remove`, and `/robloxalert list`.
- Provides `/test` for sending a test alert using the current Roblox version.
- Stores alert configuration locally in SQLite.

## Requirements

- Node.js 20 or newer (LTS recommended).
- A Discord application and bot token.
- A Discord server where the bot can view channels and send messages.

## Installation

```bash
npm install
copy .env.example .env
```

Edit `.env` and provide the required values:

| Variable | Required | Description |
| --- | --- | --- |
| `DISCORD_BOT_TOKEN` | Yes | Discord bot token |
| `DISCORD_CLIENT_ID` | Yes | Discord application ID |
| `DISCORD_GUILD_ID` | No | Comma-separated server IDs for instant command registration |
| `ALLOWED_USER_IDS` | No | Comma-separated user IDs allowed to use commands |
| `CLIENTSETTINGS_BASE` | No | Roblox client settings API base URL |

Register commands, build, and start the tracker:

```bash
npm run register-commands
npm run build
npm start
```

On Windows, `register-commands.bat` and `start-bot.bat` provide shortcuts.

## Privacy and security

Never commit `.env`, Discord tokens, server IDs, user IDs, or generated
`data.db*` files. These files are ignored by Git. If a token has ever been
shared publicly, reset it in the Discord Developer Portal immediately.

## License and disclaimer

This project is released without copyright restrictions. You may use, copy,
modify, sell, and distribute it, subject to the terms in [LICENSE](LICENSE).

The author provides no warranty and accepts no responsibility for damage,
loss, or illegal use arising from this software. Users are solely responsible
for complying with applicable laws, platform rules, and third-party terms.
