import {BotConfig, StreamConfig, ScheduleEntry, ScheduleEntryConfig} from "./config";
import {Bot} from "./bot";
import {Stream} from "./stream";
import {isStreamError} from "./types";

const START_ADVANCE = 5 * 60 * 1000; // Start stream 5 minutes early
const GAME_DURATION = 2 * 60 * 60 * 1000; // Assume that one game lasts 2 hours maximum
const CHECK_INTERVAL = 1 * 60 * 60 * 1000; // Check schedule every hour (avoiding too long setTimeouts)
const CHECK_SAFETY_MARGIN = 1 * 60 * 1000; // 1 minute overlap between checks to make sure no matches missed
const PING_INTERVAL = 30 * 60 * 1000; // Ping a running stream every 30 minutes and make screenshots

function formatTime(milliseconds: number): string {
	const seconds = Math.floor(milliseconds / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	return `${hours}h ${minutes - (hours * 60)}m ${seconds - (minutes * 60)}s`;
}

export class Scheduler {
	private bot: Bot;
	private streams: Array<Stream>;
	private schedule: Array<ScheduleEntry>;

	public constructor(
		botConfig: BotConfig,
		streamConfigs: Array<StreamConfig>,
		scheduleEntryConfigs: Array<ScheduleEntryConfig>,
	) {
		this.bot = new Bot(botConfig);
		this.streams = streamConfigs.map((streamConfig) => new Stream(streamConfig));

		this.schedule = scheduleEntryConfigs.map((scheduleEntryConfig) => this.createScheduleEntry(scheduleEntryConfig));

		this.bot.sendMessage("Starting up.");

		// this.validateSchedule();

		setInterval(() => {
			this.check();
		}, CHECK_INTERVAL);

		this.check();
	}

	private createScheduleEntry(scheduleEntryConfig: ScheduleEntryConfig): ScheduleEntry {
		const startDate = new Date(scheduleEntryConfig.start);
		const start = startDate.getTime();

		return {
			start: start - START_ADVANCE,
			end: start + scheduleEntryConfig.games * GAME_DURATION,
		};
	}

	private check(): void {
		const now = Date.now();

		this.schedule.forEach((scheduleEntry) => {
			if (scheduleEntry.start < now) {
				if (scheduleEntry.end > now && scheduleEntry.endTimeoutId === undefined) {
					const timePassed = now - scheduleEntry.start;

					this.bot.sendMessage(`Found an ongoing stream that should have been opened ${formatTime(timePassed)} ago.`);

					this.startEntry(scheduleEntry);
				}
			} else if (scheduleEntry.start < now + CHECK_INTERVAL + CHECK_SAFETY_MARGIN && scheduleEntry.startTimeoutId === undefined) {
				const timeout = scheduleEntry.start - now;

				this.bot.sendMessage(`Will open the stream in ${formatTime(timeout)}.`);

				scheduleEntry.startTimeoutId = setTimeout(() => {
					this.startEntry(scheduleEntry);
				}, timeout);
			}
		});
	}

	private async startEntry(scheduleEntry: ScheduleEntry): Promise<void> {
		const now = Date.now();
		const timeLeft = scheduleEntry.end - now;

		scheduleEntry.pingIntervalId = setInterval(() => {
			this.pingEntry(scheduleEntry);
		}, PING_INTERVAL);

		scheduleEntry.endTimeoutId = setTimeout(() => {
			this.endEntry(scheduleEntry);
		}, timeLeft);

		this.bot.sendMessage(`Opening the stream that will end in ${formatTime(timeLeft)}...`);

		try {
			const screenshotGroups = await Promise.all(this.streams.map((stream) => stream.open()));

			screenshotGroups.forEach((screenshotGroup) => this.bot.sendScreenshots(screenshotGroup));
		} catch (error) {
			if (isStreamError(error)) {
				if (error.screenshot !== undefined) {
					this.bot.sendScreenshots([error.screenshot], error.message);
				} else {
					this.bot.sendMessage(error.message);
				}
			}
		}
	}

	private async pingEntry(scheduleEntry: ScheduleEntry): Promise<void> {
		const now = Date.now();
		const timeLeft = scheduleEntry.end - now;

		this.bot.sendMessage(`Pinging the stream that will end in ${formatTime(timeLeft)}...`);

		try {
			const screenshotGroups = await Promise.all(this.streams.map((stream) => stream.ping()));

			screenshotGroups.forEach((screenshotGroup) => this.bot.sendScreenshots(screenshotGroup));
		} catch (error) {
			if (isStreamError(error)) {
				if (error.screenshot !== undefined) {
					this.bot.sendScreenshots([error.screenshot], error.message);
				} else {
					this.bot.sendMessage(error.message);
				}
			}
		}
	}

	private async endEntry(scheduleEntry: ScheduleEntry): Promise<void> {
		this.bot.sendMessage("Closing the stream...");

		if (scheduleEntry.pingIntervalId !== undefined) {
			clearInterval(scheduleEntry.pingIntervalId);
		}

		try {
			const screenshotGroups = await Promise.all(this.streams.map((stream) => stream.close()));

			screenshotGroups.forEach((screenshotGroup) => this.bot.sendScreenshots(screenshotGroup));
		} catch (error) {
			if (isStreamError(error)) {
				if (error.screenshot !== undefined) {
					this.bot.sendScreenshots([error.screenshot], error.message);
				} else {
					this.bot.sendMessage(error.message);
				}
			}
		}
	}
}
