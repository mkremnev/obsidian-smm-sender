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
	enableLogging: true
}
