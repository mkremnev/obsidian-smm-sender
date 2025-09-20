import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import TelegramSenderPlugin from "./main";

export interface TelegramBot {
	id: string;
	name: string;
	token: string;
	chatId: string;
	isEnabled: boolean;
}

export interface TelegramSenderSettings {
	bots: TelegramBot[];
	defaultBotId?: string;
	enableLogging: boolean;
}

export const DEFAULT_SETTINGS: TelegramSenderSettings = {
	bots: [],
	enableLogging: true,
};

export class TelegramSenderSettingTab extends PluginSettingTab {
	plugin: TelegramSenderPlugin;

	constructor(app: App, plugin: TelegramSenderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Telegram Sender Settings" });

		// Logging setting
		new Setting(containerEl)
			.setName("Enable Logging")
			.setDesc("Enable debug logging to console for troubleshooting")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enableLogging).onChange(async (value) => {
					this.plugin.settings.enableLogging = value;
					await this.plugin.saveSettings();
				})
			);

		// Bots section header
		const botsHeader = containerEl.createDiv();
		botsHeader.createEl("h3", { text: "Telegram Bots" });

		const addBotButton = botsHeader.createEl("button", {
			text: "Add New Bot",
			cls: "mod-cta",
		});
		addBotButton.addEventListener("click", () => {
			this.addNewBot();
		});

		// Display existing bots
		this.displayBots(containerEl);
	}

	private displayBots(containerEl: HTMLElement) {
		const botsContainer = containerEl.createDiv("telegram-bots-container");

		if (this.plugin.settings.bots.length === 0) {
			botsContainer.createEl("p", {
				text: "No bots configured yet. Add a bot to get started.",
				cls: "telegram-no-bots",
			});
			return;
		}

		this.plugin.settings.bots.forEach((bot, index) => {
			const botContainer = botsContainer.createDiv("telegram-bot-config");

			// Bot header with name and controls
			const botHeader = botContainer.createDiv("telegram-bot-header");
			botHeader.createEl("h4", { text: bot.name || `Bot ${index + 1}` });

			const botControls = botHeader.createDiv("telegram-bot-controls");

			const testButton = botControls.createEl("button", {
				text: "Test Connection",
				cls: "mod-warning",
			});
			testButton.addEventListener("click", () => this.testBotConnection(bot, testButton));

			const deleteButton = botControls.createEl("button", {
				text: "Delete",
				cls: "mod-destructive",
			});
			deleteButton.addEventListener("click", () => this.deleteBotWithConfirmation(index));

			// Bot settings
			new Setting(botContainer)
				.setName("Name")
				.setDesc("Display name for this bot")
				.addText((text) =>
					text
						.setPlaceholder("My Bot")
						.setValue(bot.name)
						.onChange(async (value) => {
							bot.name = value;
						})
				);

			new Setting(botContainer)
				.setName("Bot Token")
				.setDesc("Bot token from @BotFather")
				.addText((text) =>
					text
						.setPlaceholder("123456789:ABCdefGhIjklMnopQrStUvwXyz")
						.setValue(bot.token)
						.onChange(async (value) => {
							bot.token = value;
						})
				);

			new Setting(botContainer)
				.setName("Chat ID")
				.setDesc("Channel or chat ID where messages will be sent")
				.addText((text) =>
					text
						.setPlaceholder("-1001234567890 or @channelname")
						.setValue(bot.chatId)
						.onChange(async (value) => {
							bot.chatId = value;
						})
				);

			new Setting(botContainer)
				.setName("Enabled")
				.setDesc("Enable this bot for sending messages")
				.addToggle((toggle) =>
					toggle.setValue(bot.isEnabled).onChange(async (value) => {
						bot.isEnabled = value;
					})
				);

			new Setting(botContainer).setName("Button").addButton((button) =>
				button.setButtonText("Save bot").onClick(async () => {
					await this.plugin.saveSettings();
					this.display();
				})
			);
		});
	}

	private addNewBot() {
		const newBot: TelegramBot = {
			id: Date.now().toString(),
			name: "",
			token: "",
			chatId: "",
			isEnabled: true,
		};

		this.plugin.settings.bots.push(newBot);
		this.plugin.saveSettings().then(() => {
			this.display(); // Refresh display
		});
	}

	private async testBotConnection(bot: TelegramBot, button: HTMLButtonElement) {
		button.textContent = "Testing...";
		button.disabled = true;

		try {
			const result = await this.plugin.telegramService.testConnection(bot);

			if (result.success) {
				new Notice(`✅ Connection successful! Bot: ${result.botInfo?.first_name}`);
				button.textContent = "✅ Success";
				button.className = "mod-success";
			} else {
				new Notice(`❌ Connection failed: ${result.error}`);
				button.textContent = "❌ Failed";
				button.className = "mod-destructive";
			}
		} catch (error) {
			new Notice(`❌ Connection test error: ${error}`);
			button.textContent = "❌ Error";
			button.className = "mod-destructive";
		}

		// Reset button after 3 seconds
		setTimeout(() => {
			button.textContent = "Test Connection";
			button.className = "mod-warning";
			button.disabled = false;
		}, 3000);
	}

	private deleteBotWithConfirmation(index: number) {
		const bot = this.plugin.settings.bots[index];

		const confirmed = confirm(`Are you sure you want to delete "${bot.name || `Bot ${index + 1}`}"?`);
		if (confirmed) {
			this.plugin.settings.bots.splice(index, 1);
			this.plugin.saveSettings().then(() => {
				this.display(); // Refresh display
			});
		}
	}
}
