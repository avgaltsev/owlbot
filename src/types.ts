export interface StreamError {
	message: string;
	screenshot?: Buffer;
}

export function isStreamError(value: unknown): value is StreamError {
	if (
		typeof value === "object" &&
		value !== null &&
		typeof (value as StreamError).message === "string" &&
		(
			(value as StreamError).screenshot === undefined ||
			(value as StreamError).screenshot instanceof Buffer
		)
	) {
		return true;
	}

	return false;
}
