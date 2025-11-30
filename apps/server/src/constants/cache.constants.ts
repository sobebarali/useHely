/**
 * Cache constants
 *
 * Centralized cache key prefixes and TTL configurations.
 * Used by Redis cache operations throughout the application.
 *
 * All cache keys follow the pattern: `{prefix}:{identifier}`
 * Tenant-scoped keys use: `tenant:{tenantId}:{prefix}:{identifier}`
 */

// Cache key prefixes for auth-related data
export const AUTH_CACHE_KEYS = {
	SESSION: "session:",
	REVOKED_TOKEN: "revoked:",
	USER_SESSIONS: "user_sessions:",
	FAILED_LOGINS: "failed_logins:",
	ACCOUNT_LOCKED: "account_locked:",
	MFA_CHALLENGE: "mfa_challenge:",
} as const;

// Cache key prefixes for hospital/tenant data
export const HOSPITAL_CACHE_KEYS = {
	HOSPITAL: "hospital:",
	VERIFICATION_TOKEN: "hospital:verification:",
} as const;

// TTL values in seconds for auth cache
export const AUTH_CACHE_TTL = {
	SESSION: 3600, // 1 hour (matches access token lifetime)
	REVOKED_TOKEN: 604800, // 7 days (matches refresh token lifetime)
	FAILED_LOGIN_WINDOW: 900, // 15 minutes
	ACCOUNT_LOCK: 1800, // 30 minutes
	MFA_CHALLENGE: 300, // 5 minutes (short-lived for login flow)
} as const;

// TTL values in seconds for hospital cache
export const HOSPITAL_CACHE_TTL = {
	HOSPITAL_DATA: 3600, // 1 hour
	VERIFICATION_TOKEN: 86400, // 24 hours
} as const;

// Security thresholds
export const SECURITY_THRESHOLDS = {
	MAX_FAILED_ATTEMPTS: 5,
} as const;

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
	// Auth endpoints - stricter limits
	AUTH: {
		WINDOW_MS: 15 * 60 * 1000, // 15 minutes
		MAX_REQUESTS: 10, // 10 requests per window for login/token
	},
	// General API endpoints
	API: {
		WINDOW_MS: 60 * 1000, // 1 minute
		MAX_REQUESTS: 100, // 100 requests per minute
	},
} as const;

// Helper function to generate tenant-scoped cache keys
export function tenantCacheKey({
	tenantId,
	prefix,
	identifier,
}: {
	tenantId: string;
	prefix: string;
	identifier: string;
}): string {
	return `tenant:${tenantId}:${prefix}${identifier}`;
}

// Helper types for type-safe cache key access
export type AuthCacheKeyPrefix =
	(typeof AUTH_CACHE_KEYS)[keyof typeof AUTH_CACHE_KEYS];
export type HospitalCacheKeyPrefix =
	(typeof HOSPITAL_CACHE_KEYS)[keyof typeof HOSPITAL_CACHE_KEYS];
