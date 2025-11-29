/**
 * Authentication and Authorization Error Classes
 *
 * Specialized errors for auth-related scenarios.
 */

import { AUTH_ERROR_CODES, HTTP_STATUS } from "../constants";
import { AppError } from "./app-error";

/**
 * 401 Unauthorized
 * Used when authentication is required but not provided or invalid
 */
export class UnauthorizedError extends AppError {
	constructor(
		message = "Authentication required",
		code: string = AUTH_ERROR_CODES.UNAUTHORIZED,
		details?: Record<string, unknown>,
	) {
		super({
			message,
			status: HTTP_STATUS.UNAUTHORIZED,
			code,
			details,
		});
		Object.setPrototypeOf(this, UnauthorizedError.prototype);
	}
}

/**
 * 401 Invalid Credentials
 * Used when username/password combination is incorrect
 */
export class InvalidCredentialsError extends AppError {
	constructor(
		message = "Invalid username or password",
		code: string = AUTH_ERROR_CODES.INVALID_CREDENTIALS,
		details?: Record<string, unknown>,
	) {
		super({
			message,
			status: HTTP_STATUS.UNAUTHORIZED,
			code,
			details,
		});
		Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
	}
}

/**
 * 401 Invalid Token
 * Used when a token is invalid, expired, or revoked
 */
export class InvalidTokenError extends AppError {
	constructor(
		message = "Invalid or expired token",
		code: string = AUTH_ERROR_CODES.INVALID_TOKEN,
		details?: Record<string, unknown>,
	) {
		super({
			message,
			status: HTTP_STATUS.UNAUTHORIZED,
			code,
			details,
		});
		Object.setPrototypeOf(this, InvalidTokenError.prototype);
	}
}

/**
 * 403 Forbidden
 * Used when the user is authenticated but lacks permission
 */
export class ForbiddenError extends AppError {
	constructor(
		message = "You do not have permission to perform this action",
		code: string = AUTH_ERROR_CODES.FORBIDDEN,
		details?: Record<string, unknown>,
	) {
		super({
			message,
			status: HTTP_STATUS.FORBIDDEN,
			code,
			details,
		});
		Object.setPrototypeOf(this, ForbiddenError.prototype);
	}
}

/**
 * 403 Account Locked
 * Used when the account is locked due to too many failed attempts
 */
export class AccountLockedError extends AppError {
	constructor(
		message = "Account is locked due to too many failed login attempts. Please try again later.",
		code: string = AUTH_ERROR_CODES.ACCOUNT_LOCKED,
		details?: Record<string, unknown>,
	) {
		super({
			message,
			status: HTTP_STATUS.FORBIDDEN,
			code,
			details,
		});
		Object.setPrototypeOf(this, AccountLockedError.prototype);
	}
}

/**
 * 403 Password Expired
 * Used when the user's password has expired and must be changed
 */
export class PasswordExpiredError extends AppError {
	constructor(
		message = "Your password has expired. Please reset your password to continue.",
		code: string = AUTH_ERROR_CODES.PASSWORD_EXPIRED,
		details?: Record<string, unknown>,
	) {
		super({
			message,
			status: HTTP_STATUS.FORBIDDEN,
			code,
			details,
		});
		Object.setPrototypeOf(this, PasswordExpiredError.prototype);
	}
}

/**
 * 403 Tenant Inactive
 * Used when the user's tenant/organization is not active
 */
export class TenantInactiveError extends AppError {
	constructor(
		message = "Your organization is not active. Please contact support.",
		code: string = AUTH_ERROR_CODES.TENANT_INACTIVE,
		details?: Record<string, unknown>,
	) {
		super({
			message,
			status: HTTP_STATUS.FORBIDDEN,
			code,
			details,
		});
		Object.setPrototypeOf(this, TenantInactiveError.prototype);
	}
}

/**
 * 400 Invalid Grant
 * Used when an OAuth2 grant type is invalid or unsupported
 */
export class InvalidGrantError extends AppError {
	constructor(
		message = "Invalid or unsupported grant type",
		code: string = AUTH_ERROR_CODES.INVALID_GRANT,
		details?: Record<string, unknown>,
	) {
		super({
			message,
			status: HTTP_STATUS.BAD_REQUEST,
			code,
			details,
		});
		Object.setPrototypeOf(this, InvalidGrantError.prototype);
	}
}

/**
 * 401 Session Expired
 * Used when the user's session has expired
 */
export class SessionExpiredError extends AppError {
	constructor(
		message = "Your session has expired. Please log in again.",
		code: string = AUTH_ERROR_CODES.SESSION_EXPIRED,
		details?: Record<string, unknown>,
	) {
		super({
			message,
			status: HTTP_STATUS.UNAUTHORIZED,
			code,
			details,
		});
		Object.setPrototypeOf(this, SessionExpiredError.prototype);
	}
}
