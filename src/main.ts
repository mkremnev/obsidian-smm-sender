import { App, Editor, MarkdownView, Modal, Notice, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, TelegramSenderSettings, TelegramBot, TelegramSenderSettingTab } from "./settings";
import { Telegram } from "./services/telegram";
import { escapeMarkdown } from "./utils/telegram";

export default class TelegramSenderPlugin extends Plugin {
	settings: TelegramSenderSettings;
	telegramService: Telegram;

	async onload() {
		await this.loadSettings();
		this.telegramService = new Telegram(this.settings.enableLogging);

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
		this.telegramService = new Telegram(this.settings.enableLogging);
	}

	// Метод для получения данных файла в виде Buffer или Blob
	async getFileData(file: any) {
		try {
			const arrayBuffer = await this.app.vault.readBinary(file);
			return {
				name: file.name,
				data: new Uint8Array(arrayBuffer),
				size: arrayBuffer.byteLength,
				type: file.extension,
			};
		} catch (error) {
			console.error("Error reading file:", error);
			return null;
		}
	}

	// Новый метод для получения медиа из заметки
	async getMediaFromNote(file: any) {
		if (!file) return false;

		const mediaFiles = [];

		// Получаем все ссылки на файлы в заметке
		const fileCache = this.app.metadataCache.getFileCache(file);

		if (fileCache?.embeds) {
			// Обрабатываем встроенные файлы (изображения, видео, аудио)
			for (const embed of fileCache.embeds) {
				const linkedFile = this.app.metadataCache.getFirstLinkpathDest(embed.link, file.path);
				if (linkedFile && this.isMediaFile(linkedFile)) {
					const arrayBuffer = await this.app.vault.readBinary(linkedFile);
					mediaFiles.push({
						file: linkedFile,
						name: linkedFile.name,
						data: arrayBuffer,
						type: this.getMediaType(linkedFile.extension),
					});
				}
			}
		}

		if (fileCache?.links) {
			// Обрабатываем обычные ссылки на файлы
			for (const link of fileCache.links) {
				const linkedFile = this.app.metadataCache.getFirstLinkpathDest(link.link, file.path);
				if (linkedFile && this.isMediaFile(linkedFile)) {
					const arrayBuffer = await this.app.vault.readBinary(linkedFile);
					mediaFiles.push({
						file: linkedFile,
						name: linkedFile.name,
						data: arrayBuffer,
						type: this.getMediaType(linkedFile.extension),
					});
				}
			}
		}

		return mediaFiles;
	}

	// Проверяем, является ли файл медиа
	isMediaFile(file: any): boolean {
		const mediaExtensions = [
			"jpg",
			"jpeg",
			"png",
			"gif",
			"webp",
			"bmp",
			"svg",
			"mp4",
			"avi",
			"mov",
			"wmv",
			"mp3",
			"wav",
			"ogg",
			"pdf",
		];
		return mediaExtensions.includes(file.extension.toLowerCase());
	}

	// Определяем тип медиа
	getMediaType(extension: string): string {
		const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "bmp"];
		const videoExtensions = ["mp4", "avi", "mov", "wmv"];
		const audioExtensions = ["mp3", "wav", "ogg"];

		if (imageExtensions.includes(extension.toLowerCase())) return "photo";
		if (videoExtensions.includes(extension.toLowerCase())) return "video";
		if (audioExtensions.includes(extension.toLowerCase())) return "audio";
		return "document";
	}

	private processMarkdownV2(text: string): string {
		// Используем плейсхолдеры БЕЗ специальных символов MarkdownV2
		const protectedText = text
			// Защищаем жирный текст **text**
			.replace(/\*\*(.*?)\*\*/g, "XBOLDSTARTX$1XBOLDENDX")
			// Защищаем курсив *text* (одиночные звездочки)
			.replace(/(?<!\*)\*(?!\*)([^*]+?)\*(?!\*)/g, "XITALICSTARTX$1XITALICENDX")
			// Защищаем зачеркнутый текст ~text~
			.replace(/~(.*?)~/g, "XSTRIKESTARTX$1XSTRIKEENDX")
			// Защищаем подчеркнутый текст __text__
			.replace(/__(.*?)__/g, "XUNDERLINESTARTX$1XUNDERLINEENDX")
			// Защищаем код `code`
			.replace(/`([^`]+?)`/g, "XCODESTARTX$1XCODEENDX")
			// Защищаем блоки кода ```code```
			.replace(/```([\s\S]*?)```/g, "XCODEBLOCKSTARTX$1XCODEBLOCKENDX")
			// Защищаем ссылки [text](url)
			.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, "XLINKSTARTX$1XLINKMIDX$2XLINKENDX");

		// Экранируем все специальные символы
		const escapedText = escapeMarkdown(protectedText);

		// Восстанавливаем защищенные markdown конструкции
		return (
			escapedText
				// Восстанавливаем жирный текст
				.replace(/XBOLDSTARTX(.*?)XBOLDENDX/g, "*$1*")
				// Восстанавливаем курсив
				.replace(/XITALICSTARTX(.*?)XITALICENDX/g, "_$1_")
				// Восстанавливаем зачеркнутый
				.replace(/XSTRIKESTARTX(.*?)XSTRIKEENDX/g, "~$1~")
				// Восстанавливаем подчеркнутый
				.replace(/XUNDERLINESTARTX(.*?)XUNDERLINEENDX/g, "__$1__")
				// Восстанавливаем код
				.replace(/XCODESTARTX(.*?)XCODEENDX/g, "`$1`")
				// Восстанавливаем блоки кода
				.replace(/XCODEBLOCKSTARTX([\s\S]*?)XCODEBLOCKENDX/g, "```$1```")
				// Восстанавливаем ссылки
				.replace(/XLINKSTARTX(.*?)XLINKMIDX(.*?)XLINKENDX/g, "[$1]($2)")
		);
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

		// Getting all media files from a note
		const mediaFiles = await this.getMediaFromNote(activeView?.file);

		// Regular expressions for cleaning images
		const simpleImageRegex = /!\[[^\]]*\]/g; //  ![name_file]
		const embedImageRegex = /!\[\[[^\]]*\]\]/g; //![[name_file]]
		const markdownImageRegex = /!\[[^\]]*\]\([^)]*\)/g; // ![alt](path)

		// Format message with title and clean images
		const cleanContent = noteContent
			.replace(embedImageRegex, "")
			.replace(simpleImageRegex, "")
			.replace(markdownImageRegex, "");

		// Format message with title
		const message = `*${noteTitle}*\n${this.processMarkdownV2(cleanContent)}`;

		if (enabledBots.length === 1) {
			// Send to the only enabled bot
			let success: boolean;
			if (Array.isArray(mediaFiles) && mediaFiles?.length) {
				success = await this.telegramService.sendMediaFiles(enabledBots[0], mediaFiles, message);
			} else {
				success = await this.telegramService.sendMessage(enabledBots[0], message);
			}
			if (success) {
				new Notice(`Note sent to ${enabledBots[0].name}`);
			}
		} else {
			// Show bot selection modal if multiple bots are enabled
			new BotSelectionModal(this.app, enabledBots, async (selectedBot: TelegramBot) => {
				let success: boolean;
				if (mediaFiles || (Array.isArray(mediaFiles) && mediaFiles?.length)) {
					success = await this.telegramService.sendMediaFiles(selectedBot, mediaFiles, message);
				} else {
					success = await this.telegramService.sendMessage(selectedBot, message);
				}
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
