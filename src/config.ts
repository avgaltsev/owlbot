export interface BotConfig {
	token: string;
	chatId: string;
}

export interface StreamConfig {
	host: string;
	port: number;
	token: string;
}

export interface ScheduleEntryConfig {
	start: string;
	games: number;
}

export interface ScheduleEntry {
	start: number;
	end: number;
	// eslint-disable-next-line no-undef
	startTimeoutId?: NodeJS.Timeout;
	// eslint-disable-next-line no-undef
	pingIntervalId?: NodeJS.Timeout;
	// eslint-disable-next-line no-undef
	endTimeoutId?: NodeJS.Timeout;
}
