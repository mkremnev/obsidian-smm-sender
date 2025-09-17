import { TelegramBot as TelegramBotConfig } from './settings';
import { Notice, requestUrl } from 'obsidian';

export interface ConnectionTestResult {
	success: boolean;
	error?: string;
	botInfo?: {
		id: number;
		first_name: string;
		username?: string;
	};
}

export class TelegramService {
	private enableLogging: boolean;

	constructor(enableLogging = true) {
		this.enableLogging = enableLogging;
	}

	private log(message: string, data?: any): void {
		if (this.enableLogging) {
			console.log(`[Telegram Sender] ${message}`, data || '');
		}
	}

	private logError(message: string, error?: any): void {
		if (this.enableLogging) {
			console.error(`[Telegram Sender] ERROR: ${message}`, error || '');
		}
	}

	private async makeApiRequest(token: string, method: string, params?: any): Promise<any> {
		const url = `https://api.telegram.org/bot${token}/${method}`;
		
		try {
			const response = await requestUrl({
				url,
				method: 'POST',
				contentType: 'application/json',
				body: JSON.stringify(params || {})
			});

			this.log(`API request to ${method}`, { status: response.status, params });

			if (response.status !== 200) {
				throw new Error(`HTTP ${response.status}: ${response.text}`);
			}

			const data = response.json;
			if (!data.ok) {
				throw new Error(`Telegram API error: ${data.description} (code: ${data.error_code})`);
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
			const error = 'Bot token is required';
			this.logError(error);
			return { success: false, error };
		}

		if (!botConfig.chatId) {
			const error = 'Chat ID is required';
			this.logError(error);
			return { success: false, error };
		}

		try {
			// Get bot information first
			this.log('Getting bot information...');
			const me = await this.makeApiRequest(botConfig.token, 'getMe');
			this.log('Bot info retrieved successfully', me);

			// Test if we can send a message to the chat
			this.log(`Testing message send to chat: ${botConfig.chatId}`);
			const testMessage = '🔧 Connection test from Obsidian Telegram Sender plugin';
			
			await this.makeApiRequest(botConfig.token, 'sendMessage', {
				chat_id: botConfig.chatId,
				text: testMessage
			});
			this.log('Test message sent successfully');

			return {
				success: true,
				botInfo: {
					id: me.id,
					first_name: me.first_name,
					username: me.username
				}
			};
		} catch (error: any) {
			let errorMessage = 'Unknown error occurred';
			
			if (error.message) {
				if (error.message.includes('401')) {
					errorMessage = 'Invalid bot token';
				} else if (error.message.includes('400')) {
					if (error.message.includes('chat not found')) {
						errorMessage = 'Chat ID not found or bot not added to the chat';
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

	async sendMessage(botConfig: TelegramBotConfig, message: string): Promise<boolean> {
		if (!botConfig.isEnabled) {
			this.log(`Bot ${botConfig.name} is disabled, skipping send`);
			return false;
		}

		this.log(`Sending message via bot: ${botConfig.name}`);
		
		try {
			await this.makeApiRequest(botConfig.token, 'sendMessage', {
				chat_id: botConfig.chatId,
				text: message,
				parse_mode: 'Markdown',
				disable_web_page_preview: true
			});
			
			this.log('Message sent successfully');
			return true;
		} catch (error: any) {
			let errorMessage = 'Failed to send message';
			
			if (error.message) {
				errorMessage = error.message;
			}

			this.logError(`Send message failed: ${errorMessage}`, error);
			new Notice(`Failed to send to ${botConfig.name}: ${errorMessage}`);
			return false;
		}
	}
}
