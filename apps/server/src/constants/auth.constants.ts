/**
 * Authentication constants
 *
 * Token configuration, grant types, and auth-specific error codes
 * Used by the OAuth2 implementation in apis/auth/
 */

// Token configuration
export const TOKEN_CONFIG = {
	ACCESS_TOKEN_EXPIRY: 3600, // 1 hour in seconds
	REFRESH_TOKEN_EXPIRY: 604800, // 7 days in seconds
	MAX_FAILED_ATTEMPTS: 5,
	LOCKOUT_DURATION: 900, // 15 minutes in seconds
} as const;

// Token types
export const TOKEN_TYPES = {
	BEARER: "Bearer",
} as const;

// Grant types for OAuth2
export const GRANT_TYPES = {
	PASSWORD: "password",
	REFRESH_TOKEN: "refresh_token",
	AUTHORIZATION_CODE: "authorization_code",
} as const;

// Auth-specific error codes
export const AUTH_ERROR_CODES = {
	INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
	INVALID_TOKEN: "INVALID_TOKEN",
	TOKEN_EXPIRED: "TOKEN_EXPIRED",
	ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
	PASSWORD_EXPIRED: "PASSWORD_EXPIRED",
	TENANT_INACTIVE: "TENANT_INACTIVE",
	UNAUTHORIZED: "UNAUTHORIZED",
	FORBIDDEN: "FORBIDDEN",
	INVALID_GRANT: "INVALID_GRANT",
	SESSION_EXPIRED: "SESSION_EXPIRED",
} as const;

export type AuthErrorCode =
	(typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];
