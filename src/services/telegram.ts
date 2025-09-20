import { TelegramBot, TelegramBot as TelegramBotConfig } from "../settings";
import { Notice, requestUrl } from "obsidian";

export interface ConnectionTestResult {
	success: boolean;
	error?: string;
	botInfo?: {
		id: number;
		first_name: string;
		username?: string;
	};
}

export class Telegram {
	private enableLogging: boolean;

	constructor(enableLogging = true) {
		this.enableLogging = enableLogging;
	}

	private log(message: string, data?: any): void {
		if (this.enableLogging) {
			console.log(`[Telegram Sender] ${message}`, data || "");
		}
	}

	private logError(message: string, error?: any): void {
		if (this.enableLogging) {
			console.error(`[Telegram Sender] ERROR: ${message}`, error || "");
		}
	}

	private async makeApiRequest(token: string, method: string, body?: any, headers?: any): Promise<any> {
		const url = `https://api.telegram.org/bot${token}/${method}`;

		try {
			const response = await requestUrl({
				url,
				method: "POST",
				body,
				headers,
			});

			this.log(`API request to ${method}`, { status: response.status, body });

			if (response.status !== 200) {
				throw new Error(`HTTP ${response.status}: ${response.text}`);
			}

			const data = response.json;
			if (!data.ok) {
				throw new Error(`Telegram API error: ${data.description} (code: ${data.error_code}) error ${data}`);
			}

			return data.result;
		} catch (error: any) {
			this.logError(`API request failed for ${method}`, error);
			throw error;
		}
	}

	async testConnection(botConfig: TelegramBotConfig): Promise<ConnectionTestResult> {
		this.log(`Testing connection for bot: ${botConfig.name}`);

		if (!botConfig.token) {
			const error = "Bot token is required";
			this.logError(error);
			return { success: false, error };
		}

		if (!botConfig.chatId) {
			const error = "Chat ID is required";
			this.logError(error);
			return { success: false, error };
		}

		try {
			// Get bot information first
			this.log("Getting bot information...");
			const me = await this.makeApiRequest(botConfig.token, "getMe");
			this.log("Bot info retrieved successfully", me);

			// Test if we can send a message to the chat
			this.log(`Testing message send to chat: ${botConfig.chatId}`);
			const testMessage = "🔧 Connection test from Obsidian Telegram Sender plugin";

			await this.makeApiRequest(
				botConfig.token,
				"sendMessage",
				JSON.stringify({
					chat_id: botConfig.chatId,
					text: testMessage,
				}),
				{ "Content-type": "application/json" }
			);
			this.log("Test message sent successfully");

			return {
				success: true,
				botInfo: {
					id: me.id,
					first_name: me.first_name,
					username: me.username,
				},
			};
		} catch (error: any) {
			let errorMessage = "Unknown error occurred";

			if (error.message) {
				if (error.message.includes("400")) {
					if (error.message.includes("can't parse entities")) {
						errorMessage = "Message formatting error (MarkdownV2 parse error)";
						this.logError("Try escaping special characters or removing parse_mode", error);
					} else if (error.message.includes("message is too long")) {
						errorMessage = "Message is too long (max 4096 characters)";
					} else if (error.message.includes("chat not found")) {
						errorMessage = "Chat ID not found or bot not added to the chat";
					} else {
						errorMessage = error.message;
					}
				} else {
					errorMessage = error.message;
				}
			}

			this.logError(`Connection test failed: ${errorMessage}`, error);
			return { success: false, error: errorMessage };
		}
	}

	async sendMessage(bot: TelegramBotConfig, message: string): Promise<boolean> {
		if (!bot.isEnabled) {
			this.log(`Bot ${bot.name} is disabled, skipping send`);
			return false;
		}

		this.log(`Sending message via bot: ${bot.name}`);

		try {
			await this.makeApiRequest(
				bot.token,
				"sendMessage",
				JSON.stringify({
					chat_id: bot.chatId,
					text: message,
					parse_mode: "MarkdownV2",
					disable_web_page_preview: true,
				}),
				{ "Content-Type": "application/json" }
			);

			this.log("Message sent successfully");
			return true;
		} catch (error: any) {
			let errorMessage = "Failed to send message";

			if (error.message) {
				errorMessage = error.message;
			}

			this.logError(`Send message failed: ${errorMessage}`, error);
			new Notice(`Failed to send to ${bot.name}: ${errorMessage}`);
			return false;
		}
	}

	async sendMediaFiles(bot: TelegramBot, mediaFiles: any[], caption?: string): Promise<boolean> {
		try {
			if (mediaFiles.length === 0) {
				return false;
			}

			if (mediaFiles.length === 1) {
				// Отправляем один файл
				return await this.sendSingleMedia(bot, mediaFiles[0], caption);
			} else {
				// Отправляем группу файлов (максимум 10 файлов в группе)
				const chunks = this.chunkArray(mediaFiles, 10);

				for (let i = 0; i < chunks.length; i++) {
					const chunkCaption = i === 0 ? caption : undefined;
					const success = await this.sendMediaGroup(bot, chunks[i], chunkCaption);
					if (!success) return false;
				}

				return true;
			}
		} catch (error) {
			this.logError("Error sending media files:");
			new Notice(`Failed to send to ${bot.name}: ${error}`);
			return false;
		}
	}

	private async sendSingleMedia(bot: TelegramBot, mediaFile: any, caption?: string): Promise<boolean> {
		const baseUrl = `https://api.telegram.org/bot${bot.token}`;
		let endpoint = "";

		// Determine the endpoint depending on the file type
		switch (mediaFile.type) {
			case "photo":
				endpoint = "/sendPhoto";
				break;
			case "video":
				endpoint = "/sendVideo";
				break;
			case "audio":
				endpoint = "/sendAudio";
				break;
			default:
				endpoint = "/sendDocument";
		}

		const formData = new FormData();
		formData.append("chat_id", bot.chatId);

		// Define the field name for the file
		const fileField =
			mediaFile.type === "photo"
				? "photo"
				: mediaFile.type === "video"
					? "video"
					: mediaFile.type === "audio"
						? "audio"
						: "document";

		// create Blob
		const blob = new Blob([mediaFile.data]);
		formData.append(fileField, blob, mediaFile.name);

		if (caption) {
			formData.append("caption", caption);
			formData.append("parse_mode", "MarkdownV2");
		}

		const response = await fetch(baseUrl + endpoint, {
			method: "POST",
			body: formData,
		});

		const result = await response.json();

		this.log("Single media response:", result);

		return result.ok;
	}

	private async sendMediaGroup(bot: TelegramBot, mediaFiles: any[], caption?: string): Promise<boolean> {
		const url = `https://api.telegram.org/bot${bot.token}/sendMediaGroup`;

		const formData = new FormData();
		const media: any[] = [];

		mediaFiles.forEach((file, index) => {
			const attachName = `attach://file${index}`;

			const blob = new Blob([file.data]);
			formData.append(`file${index}`, blob, file.name);

			const mediaItem: any = {
				type: file.type,
				media: attachName,
			};

			// Add caption only to the first element
			if (index === 0 && caption) {
				mediaItem.caption = caption;
				mediaItem.parse_mode = "MarkdownV2";
			}

			media.push(mediaItem);
		});

		formData.append("chat_id", bot.chatId);
		formData.append("media", JSON.stringify(media));

		const response = await fetch(url, {
			method: "POST",
			body: formData,
		});

		const result = await response.json();

		this.log("Media group response:", result);

		return result.ok;
	}

	private chunkArray(array: any[], size: number): any[][] {
		const chunks = [];
		for (let i = 0; i < array.length; i += size) {
			chunks.push(array.slice(i, i + size));
		}
		return chunks;
	}
}
