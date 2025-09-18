import { App, Editor, MarkdownView, Modal, Notice, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, TelegramSenderSettings, TelegramBot, TelegramSenderSettingTab } from "./settings";
import { TelegramService } from "./services/telegram-service";

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

		const enabledBots = this.settings.bots.filter((bot) => bot.isEnabled);
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

		this.bots.forEach((bot) => {
			const botEl = contentEl.createDiv("telegram-bot-option");
			botEl.createEl("strong", { text: bot.name });
			botEl.createEl("div", {
				text: `Chat: ${bot.chatId}`,
				cls: "telegram-bot-chat-id",
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
