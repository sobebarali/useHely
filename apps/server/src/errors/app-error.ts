/**
 * Base application error class
 *
 * All custom application errors should extend this class.
 * Provides structured error handling with HTTP status codes and error codes.
 */
export class AppError extends Error {
	public readonly status: number;
	public readonly code: string;
	public readonly isOperational: boolean;
	public readonly details?: Record<string, unknown>;

	constructor({
		message,
		status,
		code,
		isOperational = true,
		details,
	}: {
		message: string;
		status: number;
		code: string;
		isOperational?: boolean;
		details?: Record<string, unknown>;
	}) {
		super(message);

		this.status = status;
		this.code = code;
		this.isOperational = isOperational;
		this.details = details;

		// Maintains proper stack trace for where our error was thrown
		Error.captureStackTrace(this, this.constructor);

		// Set the prototype explicitly for instanceof checks
		Object.setPrototypeOf(this, AppError.prototype);
	}

	/**
	 * Convert error to JSON for API response
	 */
	toJSON(): {
		code: string;
		message: string;
		details?: Record<string, unknown>;
	} {
		return {
			code: this.code,
			message: this.message,
			...(this.details && { details: this.details }),
		};
	}

	/**
	 * Check if an error is an instance of AppError
	 */
	static isAppError(error: unknown): error is AppError {
		return error instanceof AppError;
	}
}
