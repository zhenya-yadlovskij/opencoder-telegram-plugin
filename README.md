# OpenCode Telegram Notification Plugin

> This is a fork of [Tommertom/opencoder-telegram-plugin](https://github.com/Tommertom/opencoder-telegram-plugin), updated for OpenCode v2. The original project and its contributors are credited for the initial implementation.

Get OpenCode notifications via Telegram.

> **Disclaimer:** This project is not affiliated with, endorsed by, or sponsored by OpenCode, SST, or any of their affiliates. OpenCode is a trademark of SST.

## Features

- 🔔 **Task Completion Notifications**: Get notified when OpenCode agent finishes tasks
- ❓ **Question Alerts**: Receive notifications when OpenCode asks questions
- 🔐 **Secure**: Whitelist-based user access control
- 💬 **Simple Setup**: Automatic chat discovery and configuration

## Requirements

- Node.js 22+ and npm
- OpenCode v2 (target SDK: 2.1.4); OpenCode v1 is not supported by this fork
- Telegram Bot (from [@BotFather](https://t.me/BotFather))

## Installation

### 1. Create Telegram Bot

1. Talk to [@BotFather](https://t.me/BotFather)
2. Create a new bot with `/newbot`
3. Save the bot token

### 2. Start a Private Chat with the Bot

1. Open your bot in Telegram
2. Tap **Start**
3. Send any message to establish the chat

### 3. Get Your User ID

1. Send any message to [@userinfobot](https://t.me/userinfobot)
2. Save your numeric user ID

### 4. Configure Plugin

Clone and build:

```bash
git clone https://github.com/zhenya-yadlovskij/opencoder-telegram-plugin.git
cd opencoder-telegram-plugin/plugin
npm install
npm run build
```

Set the following environment variables in the environment that starts the OpenCode server. Alternatively, create a `.env` file in the server's working directory (the directory where OpenCode is started):

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_ALLOWED_USER_IDS=123456789,987654321
# Optional: Pre-configure your chat_id (or let the bot discover it automatically)
# TELEGRAM_CHAT_ID=your_chat_id_here
```

### 5. Install in OpenCode

Add the absolute path of the **plugin directory** to `~/.config/opencode/opencode.json` (replace the example path with your checkout):

```json
{
  "plugins": ["/absolute/path/to/opencoder-telegram-plugin/plugin"]
}
```

Start or restart OpenCode from the directory containing your `.env`, or export the variables before starting its server. OpenCode v2 loads directory packages; do not point the configuration at the JavaScript file.

## Usage

### Initial Setup

1. Start OpenCode with the plugin enabled
2. Open your Telegram bot and send any message (e.g., "Hello")
3. The bot will reply with your chat_id and confirm the connection
4. You're ready to receive notifications!

### Receiving Notifications

The plugin automatically sends notifications to your Telegram chat when:

- **Agent finishes**: When OpenCode completes a task, you'll receive a message like:
  ```
  Agent has finished: [Session Title]
  ```

- **Questions asked**: When OpenCode creates a form requesting input, you'll receive:
  ```
  📋 [Session Title]
  
  ❓ Questions:
  1. [Question text]
  ```

### Optional: Pre-configure Chat ID

If you prefer, add your chat_id to the `.env` file to skip the initial setup:

```bash
TELEGRAM_CHAT_ID=your_chat_id_here
```

You can get your chat_id by messaging the bot once, or using [@userinfobot](https://t.me/userinfobot).

## Security

### Access Control

- Only whitelisted user IDs can interact with the bot
- User whitelist is comma-separated in `.env`
- Non-whitelisted users are silently ignored

### Best Practices

1. Use a **private** chat with the bot
2. Keep the bot token secret
3. Only add trusted users to whitelist
4. Review `.env` file permissions (should be readable only by you)

## Configuration Reference

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | ✅ | Bot token from @BotFather | `123456:ABC-DEF...` |
| `TELEGRAM_ALLOWED_USER_IDS` | ✅ | Comma-separated user IDs | `123456789,987654321` |
| `TELEGRAM_CHAT_ID` | ❌ | Optional pre-configured chat ID | `123456789` |

## Troubleshooting

### Bot doesn't send notifications

- Verify bot token is correct in `.env`
- Confirm your user ID is in the whitelist
- Ensure you've established a chat (send any message to the bot first)
- Check OpenCode logs for errors

### Chat not connecting

- Make sure you're using a **private** chat (not a group)
- Send any message to the bot to trigger chat discovery
- If using `TELEGRAM_CHAT_ID` in `.env`, verify the ID is correct

### Permission denied

- Your user ID must be in `TELEGRAM_ALLOWED_USER_IDS`
- Check you copied the correct numeric ID (not username)
- Use [@userinfobot](https://t.me/userinfobot) to verify your user ID

## Development

### Project Structure

```
plugin/
├── src/
│   ├── telegram-remote.ts       # Main plugin entry
│   ├── bot.ts                   # Grammy bot setup
│   ├── config.ts                # Environment config
│   ├── events/                  # Event handlers
│   │   ├── session-status.ts    # Handles idle/active status
│   │   ├── session-updated.ts   # Tracks session titles
│   │   ├── question-asked.ts    # Forwards questions
│   │   ├── types.ts             # TypeScript types
│   │   └── index.ts
│   └── services/
│       └── session-title-service.ts  # Session title storage
├── dist/                        # Built output
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

### Build

```bash
cd plugin
npm run build      # Production build
npm run dev        # Watch mode
npm run typecheck  # Type checking only
npm test           # Event-handling tests
```

### Testing Locally

1. Build the plugin
2. Configure `.env` with test bot credentials
3. Point OpenCode to the plugin directory
4. Start OpenCode and message the bot to establish connection
5. Trigger OpenCode tasks to test notifications

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm run build`
5. Submit a pull request

## License

MIT
