/**
 * HTTP Error Classes
 *
 * Standard HTTP errors for common scenarios.
 * These errors are used for non-domain-specific HTTP error responses.
 */

import { ERROR_CODES, HTTP_STATUS } from "../constants";
import { AppError } from "./app-error";

/**
 * 400 Bad Request
 * Used for invalid request syntax or invalid request parameters
 */
export class BadRequestError extends AppError {
	constructor(
		message = "Bad request",
		code: string = ERROR_CODES.INVALID_INPUT,
		details?: Record<string, unknown>,
	) {
		super({
			message,
			status: HTTP_STATUS.BAD_REQUEST,
			code,
			details,
		});
		Object.setPrototypeOf(this, BadRequestError.prototype);
	}
}

/**
 * 404 Not Found
 * Used when a requested resource does not exist
 */
export class NotFoundError extends AppError {
	constructor(
		message = "Resource not found",
		code: string = ERROR_CODES.NOT_FOUND,
		details?: Record<string, unknown>,
	) {
		super({
			message,
			status: HTTP_STATUS.NOT_FOUND,
			code,
			details,
		});
		Object.setPrototypeOf(this, NotFoundError.prototype);
	}
}

/**
 * 409 Conflict
 * Used when the request conflicts with the current state (e.g., duplicate entry)
 */
export class ConflictError extends AppError {
	constructor(
		message = "Resource already exists",
		code: string = ERROR_CODES.CONFLICT,
		details?: Record<string, unknown>,
	) {
		super({
			message,
			status: HTTP_STATUS.CONFLICT,
			code,
			details,
		});
		Object.setPrototypeOf(this, ConflictError.prototype);
	}
}

/**
 * 410 Gone
 * Used when a resource is no longer available and will not be available again
 * (e.g., expired reports, deleted resources)
 */
export class GoneError extends AppError {
	constructor(
		message = "Resource is no longer available",
		code: string = ERROR_CODES.GONE,
		details?: Record<string, unknown>,
	) {
		super({
			message,
			status: HTTP_STATUS.GONE,
			code,
			details,
		});
		Object.setPrototypeOf(this, GoneError.prototype);
	}
}

/**
 * 422 Unprocessable Entity
 * Used for validation errors where the syntax is correct but semantics are wrong
 */
export class ValidationError extends AppError {
	constructor(
		message = "Validation failed",
		code: string = ERROR_CODES.VALIDATION_ERROR,
		details?: Record<string, unknown>,
	) {
		super({
			message,
			status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
			code,
			details,
		});
		Object.setPrototypeOf(this, ValidationError.prototype);
	}
}

/**
 * 429 Too Many Requests
 * Used for rate limiting
 */
export class RateLimitError extends AppError {
	constructor(
		message = "Too many requests, please try again later",
		code: string = ERROR_CODES.RATE_LIMIT_EXCEEDED,
		details?: Record<string, unknown>,
	) {
		super({
			message,
			status: HTTP_STATUS.TOO_MANY_REQUESTS,
			code,
			details,
		});
		Object.setPrototypeOf(this, RateLimitError.prototype);
	}
}

/**
 * 500 Internal Server Error
 * Used for unexpected server errors
 */
export class InternalError extends AppError {
	constructor(
		message = "An unexpected error occurred",
		code: string = ERROR_CODES.INTERNAL_ERROR,
		details?: Record<string, unknown>,
	) {
		super({
			message,
			status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
			code,
			isOperational: false,
			details,
		});
		Object.setPrototypeOf(this, InternalError.prototype);
	}
}

/**
 * 503 Service Unavailable
 * Used when a service is temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
	constructor(
		message = "Service temporarily unavailable",
		code: string = ERROR_CODES.SERVICE_UNAVAILABLE,
		details?: Record<string, unknown>,
	) {
		super({
			message,
			status: HTTP_STATUS.SERVICE_UNAVAILABLE,
			code,
			details,
		});
		Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
	}
}
