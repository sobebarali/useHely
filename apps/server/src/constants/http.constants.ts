/**
 * HTTP and common error constants
 *
 * Standard HTTP status codes and application-wide error codes
 */

// HTTP Status codes
export const HTTP_STATUS = {
	// Success
	OK: 200,
	CREATED: 201,
	ACCEPTED: 202,
	NO_CONTENT: 204,

	// Redirection
	MOVED_PERMANENTLY: 301,
	FOUND: 302,
	NOT_MODIFIED: 304,

	// Client errors
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	METHOD_NOT_ALLOWED: 405,
	CONFLICT: 409,
	GONE: 410,
	UNPROCESSABLE_ENTITY: 422,
	TOO_MANY_REQUESTS: 429,

	// Server errors
	INTERNAL_SERVER_ERROR: 500,
	NOT_IMPLEMENTED: 501,
	BAD_GATEWAY: 502,
	SERVICE_UNAVAILABLE: 503,
} as const;

// Common application error codes (non-domain specific)
export const ERROR_CODES = {
	// Validation errors
	VALIDATION_ERROR: "VALIDATION_ERROR",
	INVALID_INPUT: "INVALID_INPUT",
	MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

	// Resource errors
	NOT_FOUND: "NOT_FOUND",
	ALREADY_EXISTS: "ALREADY_EXISTS",
	CONFLICT: "CONFLICT",
	GONE: "GONE",

	// Server errors
	INTERNAL_ERROR: "INTERNAL_ERROR",
	SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
	DATABASE_ERROR: "DATABASE_ERROR",

	// Rate limiting
	RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
