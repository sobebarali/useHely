import { createServiceLogger } from "../logger";
import { redis } from "../redis";

const logger = createServiceLogger("authCache");

// Cache key prefixes
const CACHE_KEYS = {
	SESSION: "session:",
	REVOKED_TOKEN: "revoked:",
	USER_SESSIONS: "user_sessions:",
	FAILED_LOGINS: "failed_logins:",
	ACCOUNT_LOCKED: "account_locked:",
} as const;

// TTL values in seconds
const TTL = {
	SESSION: 3600, // 1 hour (access token lifetime)
	REVOKED_TOKEN: 604800, // 7 days (refresh token lifetime)
	FAILED_LOGIN_WINDOW: 900, // 15 minutes
	ACCOUNT_LOCK: 1800, // 30 minutes
} as const;

// Maximum failed login attempts before locking
const MAX_FAILED_ATTEMPTS = 5;

/**
 * Store session data in cache
 */
export async function cacheSession({
	sessionId,
	userId,
	tenantId,
	roles,
	permissions,
	expiresIn = TTL.SESSION,
}: {
	sessionId: string;
	userId: string;
	tenantId: string;
	roles: string[];
	permissions: string[];
	expiresIn?: number;
}): Promise<void> {
	const key = `${CACHE_KEYS.SESSION}${sessionId}`;
	const data = JSON.stringify({
		userId,
		tenantId,
		roles,
		permissions,
		cachedAt: Date.now(),
	});

	await redis.set(key, data, { ex: expiresIn });
	logger.debug({ sessionId, userId }, "Session cached");
}

/**
 * Get cached session data
 */
export async function getCachedSession({
	sessionId,
}: {
	sessionId: string;
}): Promise<{
	userId: string;
	tenantId: string;
	roles: string[];
	permissions: string[];
} | null> {
	const key = `${CACHE_KEYS.SESSION}${sessionId}`;
	const data = await redis.get<string>(key);

	if (!data) {
		return null;
	}

	try {
		return JSON.parse(data);
	} catch {
		logger.warn({ sessionId }, "Failed to parse cached session");
		return null;
	}
}

/**
 * Invalidate a session from cache
 */
export async function invalidateSession({
	sessionId,
}: {
	sessionId: string;
}): Promise<void> {
	const key = `${CACHE_KEYS.SESSION}${sessionId}`;
	await redis.del(key);
	logger.debug({ sessionId }, "Session invalidated");
}

/**
 * Mark a token as revoked
 */
export async function revokeToken({
	token,
	expiresIn = TTL.REVOKED_TOKEN,
}: {
	token: string;
	expiresIn?: number;
}): Promise<void> {
	// Use a hash of the token as key to avoid storing sensitive data
	const tokenHash = Buffer.from(token).toString("base64").slice(0, 32);
	const key = `${CACHE_KEYS.REVOKED_TOKEN}${tokenHash}`;

	await redis.set(key, "1", { ex: expiresIn });
	logger.debug("Token revoked and cached");
}

/**
 * Check if a token is revoked
 */
export async function isTokenRevoked({
	token,
}: {
	token: string;
}): Promise<boolean> {
	const tokenHash = Buffer.from(token).toString("base64").slice(0, 32);
	const key = `${CACHE_KEYS.REVOKED_TOKEN}${tokenHash}`;

	const result = await redis.get(key);
	return result !== null;
}

/**
 * Track user sessions for a user
 */
export async function addUserSession({
	userId,
	sessionId,
}: {
	userId: string;
	sessionId: string;
}): Promise<void> {
	const key = `${CACHE_KEYS.USER_SESSIONS}${userId}`;
	await redis.sadd(key, sessionId);
	logger.debug({ userId, sessionId }, "Session added to user sessions");
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions({
	userId,
}: {
	userId: string;
}): Promise<string[]> {
	const key = `${CACHE_KEYS.USER_SESSIONS}${userId}`;
	const sessions = await redis.smembers(key);
	return sessions || [];
}

/**
 * Remove a session from user sessions
 */
export async function removeUserSession({
	userId,
	sessionId,
}: {
	userId: string;
	sessionId: string;
}): Promise<void> {
	const key = `${CACHE_KEYS.USER_SESSIONS}${userId}`;
	await redis.srem(key, sessionId);
	logger.debug({ userId, sessionId }, "Session removed from user sessions");
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateAllUserSessions({
	userId,
}: {
	userId: string;
}): Promise<number> {
	const sessions = await getUserSessions({ userId });

	for (const sessionId of sessions) {
		await invalidateSession({ sessionId });
	}

	const key = `${CACHE_KEYS.USER_SESSIONS}${userId}`;
	await redis.del(key);

	logger.info(
		{ userId, count: sessions.length },
		"All user sessions invalidated",
	);
	return sessions.length;
}

/**
 * Record a failed login attempt
 */
export async function recordFailedLogin({
	identifier,
}: {
	identifier: string;
}): Promise<{ attempts: number; isLocked: boolean }> {
	const key = `${CACHE_KEYS.FAILED_LOGINS}${identifier}`;

	// Increment and set TTL
	const attempts = await redis.incr(key);

	// Set expiry only on first attempt
	if (attempts === 1) {
		await redis.expire(key, TTL.FAILED_LOGIN_WINDOW);
	}

	// Check if account should be locked
	if (attempts >= MAX_FAILED_ATTEMPTS) {
		await lockAccount({ identifier });
		return { attempts, isLocked: true };
	}

	return { attempts, isLocked: false };
}

/**
 * Clear failed login attempts on successful login
 */
export async function clearFailedLogins({
	identifier,
}: {
	identifier: string;
}): Promise<void> {
	const key = `${CACHE_KEYS.FAILED_LOGINS}${identifier}`;
	await redis.del(key);
	logger.debug(
		{ identifier: `****${identifier.slice(-4)}` },
		"Failed logins cleared",
	);
}

/**
 * Lock an account
 */
export async function lockAccount({
	identifier,
}: {
	identifier: string;
}): Promise<void> {
	const key = `${CACHE_KEYS.ACCOUNT_LOCKED}${identifier}`;
	await redis.set(key, Date.now().toString(), { ex: TTL.ACCOUNT_LOCK });
	logger.warn(
		{ identifier: `****${identifier.slice(-4)}` },
		"Account locked due to too many failed login attempts",
	);
}

/**
 * Check if an account is locked
 */
export async function isAccountLocked({
	identifier,
}: {
	identifier: string;
}): Promise<boolean> {
	const key = `${CACHE_KEYS.ACCOUNT_LOCKED}${identifier}`;
	const result = await redis.get(key);
	return result !== null;
}

/**
 * Unlock an account
 */
export async function unlockAccount({
	identifier,
}: {
	identifier: string;
}): Promise<void> {
	const lockKey = `${CACHE_KEYS.ACCOUNT_LOCKED}${identifier}`;
	const failedKey = `${CACHE_KEYS.FAILED_LOGINS}${identifier}`;

	await redis.del(lockKey);
	await redis.del(failedKey);

	logger.info(
		{ identifier: `****${identifier.slice(-4)}` },
		"Account unlocked",
	);
}
