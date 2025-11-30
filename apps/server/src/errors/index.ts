/**
 * Errors index
 *
 * Central export point for all application error classes.
 * Import from "@/errors" for typed error handling.
 */

// Base error class
export { AppError } from "./app-error";
// Auth errors
export {
	AccountLockedError,
	ForbiddenError,
	InvalidCredentialsError,
	InvalidGrantError,
	InvalidTokenError,
	PasswordExpiredError,
	SessionExpiredError,
	TenantInactiveError,
	UnauthorizedError,
} from "./auth-errors";
// HTTP errors
export {
	BadRequestError,
	ConflictError,
	GoneError,
	InternalError,
	NotFoundError,
	RateLimitError,
	ServiceUnavailableError,
	ValidationError,
} from "./http-errors";
