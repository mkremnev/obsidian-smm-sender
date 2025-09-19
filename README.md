# SMM Sender - Obsidian Plugin

[![GitHub release](https://img.shields.io/github/v/release/mkremnev/obsidian-smm-sender)](https://github.com/mkremnev/obsidian-smm-sender/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful Obsidian plugin that enables you to seamlessly publish your notes to social media channels and messaging platforms directly from your vault.

## 🎯 Purpose

SMM Sender automates the process of sharing your Obsidian notes across various social platforms, making content distribution effortless. Whether you're a content creator, blogger, or just want to share your thoughts with different communities, this plugin streamlines your workflow by eliminating the need to manually copy and format your content for each platform.

## ✨ Features

- **📱 Telegram Integration**: Send notes directly to Telegram channels and chats
- **🤖 Multiple Bot Support**: Configure and manage multiple bots for different platforms
- **🔍 Connection Testing**: Verify bot connections before publishing
- **📝 Message Formatting**: Customize how your notes appear on different platforms
- **⚙️ Flexible Configuration**: Fine-tune publishing settings for each platform
- **📱 Cross-Platform**: Works on both desktop and mobile versions of Obsidian

## 🚀 Installation

### From Community Plugins (Recommended)

1. Open Obsidian Settings
2. Navigate to **Community Plugins** and disable Safe Mode
3. Click **Browse** and search for "SMM Sender"
4. Install the plugin and enable it
5. Configure your bot tokens in the plugin settings

### Manual Installation

1. Download the latest release from the [GitHub releases page](https://github.com/mkremnev/obsidian-telegram-sender/releases)
2. Extract the files to your vault's plugins folder: `{VaultFolder}/.obsidian/plugins/smm-sender/`
3. The folder should contain: `main.js`, `manifest.json`, and `styles.css`
4. Restart Obsidian
5. Enable the plugin in Settings → Community Plugins

## 📖 How to Use

### Initial Setup

1. **Configure Telegram Bot**:
   - Create a new bot via [@BotFather](https://t.me/botfather) on Telegram
   - Copy your bot token
   - Get your channel/chat ID (you can use [@userinfobot](https://t.me/userinfobot))

2. **Plugin Configuration**:
   - Go to Settings → SMM Sender
   - Add your bot token and channel ID
   - Test the connection using the "Test Connection" button
   - Configure message formatting preferences

### Publishing Notes

1. **Single Note Publishing**:
   - Open the note you want to publish
   - Use the command palette (`Ctrl/Cmd + P`)
   - Search for "SMM Sender: Send to Telegram"
   - Select your configured bot/channel

2. **Batch Publishing**:
   - Select multiple notes in the file explorer
   - Right-click and choose "Send to SMM platforms"
   - Choose your target platforms

3. **Quick Publishing**:
   - Use the ribbon icon for quick access
   - Configure default publishing settings for one-click sharing

### Message Formatting

The plugin supports various formatting options:

- **Plain Text**: Send notes as simple text messages
- **Markdown**: Preserve basic markdown formatting
- **Custom Templates**: Create templates for consistent formatting
- **Media Support**: Include images and attachments (where supported by the platform)

## ⚙️ Configuration

### Bot Settings

- **Bot Token**: Your Telegram bot API token
- **Channel ID**: Target channel or chat ID
- **Default Format**: Choose between plain text, markdown, or HTML
- **Message Template**: Customize how your notes are formatted

### Advanced Settings

- **Auto-publish**: Automatically publish notes when they're modified
- **Publish Confirmation**: Require confirmation before publishing
- **Error Handling**: Configure retry attempts and error notifications
- **Rate Limiting**: Set delays between multiple publications

## 🔧 Troubleshooting

### Common Issues

**Bot not responding:**
- Verify your bot token is correct
- Ensure the bot is added to your target channel
- Check if the bot has admin permissions (for channels)

**Messages not formatting correctly:**
- Review your formatting settings
- Test with a simple note first
- Check platform-specific formatting limitations

**Connection timeouts:**
- Verify your internet connection
- Try increasing timeout settings
- Check if Telegram API is accessible from your network

### Getting Help

- Check the [Issues page](https://github.com/mkremnev/obsidian-telegram-sender/issues) for known problems
- Create a new issue with detailed information about your problem
- Join the community discussions for tips and tricks

## 🛠️ Development

### Setup

```bash
# Clone the repository
git clone https://github.com/mkremnev/obsidian-telegram-sender.git
cd obsidian-telegram-sender

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Building

```bash
# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💖 Support

If you find this plugin helpful, consider supporting its development:

- ⭐ Star this repository
- 🐛 Report bugs and suggest features
- ☕ [Buy me a coffee](https://buymeacoffee.com/mxkremnev)

## 🙏 Acknowledgments

- Thanks to the Obsidian team for the excellent plugin API
- Community contributors and beta testers
- Telegram Bot API for reliable messaging infrastructure

---

**Made with ❤️ for the Obsidian community**
