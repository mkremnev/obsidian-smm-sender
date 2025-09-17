import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import { DEFAULT_SETTINGS, TelegramSenderSettings, TelegramBot } from "./settings";
import { TelegramService } from "./telegram-service";

export default class TelegramSenderPlugin extends Plugin {
	settings: TelegramSenderSettings;
	telegramService: TelegramService;

	async onload() {
		await this.loadSettings();
		this.telegramService = new TelegramService(this.settings.enableLogging);

		// Add ribbon icon for sending current note to Telegram
		const ribbonIconEl = this.addRibbonIcon("send", "Send to Telegram", async (evt: MouseEvent) => {
			await this.sendCurrentNoteToTelegram();
		});
		ribbonIconEl.addClass("telegram-sender-ribbon-class");

		// Add command to send current note to Telegram
		this.addCommand({
			id: "send-note-to-telegram",
			name: "Send current note to Telegram",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.sendCurrentNoteToTelegram();
			},
		});

		// Add settings tab
		this.addSettingTab(new TelegramSenderSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Update telegram service logging setting
		this.telegramService = new TelegramService(this.settings.enableLogging);
	}

	async sendCurrentNoteToTelegram() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice("No active note to send");
			return;
		}

		const enabledBots = this.settings.bots.filter(bot => bot.isEnabled);
		if (enabledBots.length === 0) {
			new Notice("No enabled Telegram bots configured. Please check settings.");
			return;
		}

		const noteContent = activeView.editor.getValue();
		const noteTitle = activeView.file?.basename || "Untitled Note";
		
		// Format message with title
		const message = `**${noteTitle}**\n\n${noteContent}`;

		if (enabledBots.length === 1) {
			// Send to the only enabled bot
			const success = await this.telegramService.sendMessage(enabledBots[0], message);
			if (success) {
				new Notice(`Note sent to ${enabledBots[0].name}`);
			}
		} else {
			// Show bot selection modal if multiple bots are enabled
			new BotSelectionModal(this.app, enabledBots, async (selectedBot: TelegramBot) => {
				const success = await this.telegramService.sendMessage(selectedBot, message);
				if (success) {
					new Notice(`Note sent to ${selectedBot.name}`);
				}
			}).open();
		}
	}
}

class BotSelectionModal extends Modal {
	private bots: TelegramBot[];
	private onSelect: (bot: TelegramBot) => void;

	constructor(app: App, bots: TelegramBot[], onSelect: (bot: TelegramBot) => void) {
		super(app);
		this.bots = bots;
		this.onSelect = onSelect;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		
		contentEl.createEl("h3", { text: "Select Telegram Bot" });
		
		this.bots.forEach(bot => {
			const botEl = contentEl.createDiv("telegram-bot-option");
			botEl.createEl("strong", { text: bot.name });
			botEl.createEl("div", { 
				text: `Chat: ${bot.chatId}`,
				cls: "telegram-bot-chat-id"
			});
			
			botEl.addEventListener("click", () => {
				this.onSelect(bot);
				this.close();
			});
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class TelegramSenderSettingTab extends PluginSettingTab {
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
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.enableLogging)
					.onChange(async (value) => {
						this.plugin.settings.enableLogging = value;
						await this.plugin.saveSettings();
					})
			);

		// Bots section header
		const botsHeader = containerEl.createDiv();
		botsHeader.createEl("h3", { text: "Telegram Bots" });
		
		const addBotButton = botsHeader.createEl("button", {
			text: "Add New Bot",
			cls: "mod-cta"
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
				cls: "telegram-no-bots"
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
				cls: "mod-warning"
			});
			testButton.addEventListener("click", () => this.testBotConnection(bot, testButton));
			
			const deleteButton = botControls.createEl("button", {
				text: "Delete",
				cls: "mod-destructive"
			});
			deleteButton.addEventListener("click", () => this.deleteBotWithConfirmation(index));

			// Bot settings
			new Setting(botContainer)
				.setName("Name")
				.setDesc("Display name for this bot")
				.addText(text =>
					text
						.setPlaceholder("My Bot")
						.setValue(bot.name)
						.onChange(async (value) => {
							bot.name = value;
							await this.plugin.saveSettings();
							this.display(); // Refresh display
						})
				);

			new Setting(botContainer)
				.setName("Bot Token")
				.setDesc("Bot token from @BotFather")
				.addText(text =>
					text
						.setPlaceholder("123456789:ABCdefGhIjklMnopQrStUvwXyz")
						.setValue(bot.token)
						.onChange(async (value) => {
							bot.token = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(botContainer)
				.setName("Chat ID")
				.setDesc("Channel or chat ID where messages will be sent")
				.addText(text =>
					text
						.setPlaceholder("-1001234567890 or @channelname")
						.setValue(bot.chatId)
						.onChange(async (value) => {
							bot.chatId = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(botContainer)
				.setName("Enabled")
				.setDesc("Enable this bot for sending messages")
				.addToggle(toggle =>
					toggle
						.setValue(bot.isEnabled)
						.onChange(async (value) => {
							bot.isEnabled = value;
							await this.plugin.saveSettings();
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
			isEnabled: true
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
