import { createHash } from "node:crypto";
import { StaffStatus } from "@hms/db";
import { updateStaffStatusByEmail } from "../../apis/users/repositories/shared.users.repository";
import {
	AUTH_CACHE_KEYS,
	AUTH_CACHE_TTL,
	SECURITY_THRESHOLDS,
	tenantCacheKey,
} from "../../constants/cache.constants";
import { createServiceLogger } from "../logger";
import { redis } from "../redis";

const logger = createServiceLogger("authCache");

/**
 * Generate a secure hash of a token for cache keys
 * Uses SHA-256 for cryptographic security
 */
function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

/**
 * Store session data in cache with tenant scoping
 *
 * Uses two-tier caching:
 * 1. sessionId -> tenantId mapping for quick tenant lookup
 * 2. Tenant-scoped session data for proper multi-tenant isolation
 */
export async function cacheSession({
	sessionId,
	userId,
	email,
	name,
	tenantId,
	roles,
	permissions,
	expiresIn = AUTH_CACHE_TTL.SESSION,
}: {
	sessionId: string;
	userId: string;
	email: string;
	name: string;
	tenantId: string;
	roles: string[];
	permissions: string[];
	expiresIn?: number;
}): Promise<void> {
	// Store session-to-tenant mapping for tenant discovery
	const mappingKey = `${AUTH_CACHE_KEYS.SESSION_TENANT_MAP}${sessionId}`;
	await redis.setex(mappingKey, expiresIn, tenantId);

	// Store full session data with tenant-scoped key
	const key = tenantCacheKey({
		tenantId,
		prefix: AUTH_CACHE_KEYS.SESSION,
		identifier: sessionId,
	});
	const data = JSON.stringify({
		userId,
		email,
		name,
		tenantId,
		roles,
		permissions,
		cachedAt: Date.now(),
	});

	await redis.setex(key, expiresIn, data);
	logger.debug(
		{ sessionId, userId, tenantId },
		"Session cached with tenant scoping",
	);
}

/**
 * Get cached session data using tenant-scoped lookup
 *
 * First retrieves tenantId from sessionId mapping,
 * then fetches full session data from tenant-scoped key
 */
export async function getCachedSession({
	sessionId,
}: {
	sessionId: string;
}): Promise<{
	userId: string;
	email: string;
	name: string;
	tenantId: string;
	roles: string[];
	permissions: string[];
} | null> {
	// First, get the tenant ID for this session
	const mappingKey = `${AUTH_CACHE_KEYS.SESSION_TENANT_MAP}${sessionId}`;
	const tenantId = await redis.get(mappingKey);

	if (!tenantId) {
		// Session mapping not found in cache
		return null;
	}

	// Now get the full session data using tenant-scoped key
	const key = tenantCacheKey({
		tenantId,
		prefix: AUTH_CACHE_KEYS.SESSION,
		identifier: sessionId,
	});
	const data = await redis.get(key);

	if (!data) {
		logger.warn(
			{ sessionId, tenantId },
			"Session mapping exists but session data not found",
		);
		return null;
	}

	try {
		return JSON.parse(data);
	} catch {
		logger.warn({ sessionId, tenantId }, "Failed to parse cached session");
		return null;
	}
}

/**
 * Invalidate a session from cache
 *
 * Removes both the tenant mapping and tenant-scoped session data
 */
export async function invalidateSession({
	sessionId,
}: {
	sessionId: string;
}): Promise<void> {
	// First, get the tenant ID so we can delete the tenant-scoped session
	const mappingKey = `${AUTH_CACHE_KEYS.SESSION_TENANT_MAP}${sessionId}`;
	const tenantId = await redis.get(mappingKey);

	if (tenantId) {
		// Delete tenant-scoped session data
		const sessionKey = tenantCacheKey({
			tenantId,
			prefix: AUTH_CACHE_KEYS.SESSION,
			identifier: sessionId,
		});
		await redis.del(sessionKey);
		logger.debug({ sessionId, tenantId }, "Tenant-scoped session deleted");
	}

	// Delete the session-to-tenant mapping
	await redis.del(mappingKey);
	logger.debug({ sessionId }, "Session invalidated");
}

/**
 * Mark a token as revoked
 */
export async function revokeToken({
	token,
	expiresIn = AUTH_CACHE_TTL.REVOKED_TOKEN,
}: {
	token: string;
	expiresIn?: number;
}): Promise<void> {
	// Use SHA-256 hash of the token for secure storage
	const tokenHash = hashToken(token);
	const key = `${AUTH_CACHE_KEYS.REVOKED_TOKEN}${tokenHash}`;

	await redis.setex(key, expiresIn, "1");
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
	const tokenHash = hashToken(token);
	const key = `${AUTH_CACHE_KEYS.REVOKED_TOKEN}${tokenHash}`;

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
	const key = `${AUTH_CACHE_KEYS.USER_SESSIONS}${userId}`;
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
	const key = `${AUTH_CACHE_KEYS.USER_SESSIONS}${userId}`;
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
	const key = `${AUTH_CACHE_KEYS.USER_SESSIONS}${userId}`;
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

	const key = `${AUTH_CACHE_KEYS.USER_SESSIONS}${userId}`;
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
	const key = `${AUTH_CACHE_KEYS.FAILED_LOGINS}${identifier}`;

	// Increment and set TTL
	const attempts = await redis.incr(key);

	// Set expiry only on first attempt
	if (attempts === 1) {
		await redis.expire(key, AUTH_CACHE_TTL.FAILED_LOGIN_WINDOW);
	}

	// Check if account should be locked
	if (attempts >= SECURITY_THRESHOLDS.MAX_FAILED_ATTEMPTS) {
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
	const key = `${AUTH_CACHE_KEYS.FAILED_LOGINS}${identifier}`;
	await redis.del(key);
	logger.debug(
		{ identifier: `****${identifier.slice(-4)}` },
		"Failed logins cleared",
	);
}

/**
 * Lock an account
 * Persists LOCKED status to both Redis cache and database
 */
export async function lockAccount({
	identifier,
}: {
	identifier: string;
}): Promise<void> {
	const key = `${AUTH_CACHE_KEYS.ACCOUNT_LOCKED}${identifier}`;
	await redis.setex(key, AUTH_CACHE_TTL.ACCOUNT_LOCK, Date.now().toString());

	// Persist LOCKED status to database for durability and queryability
	try {
		await updateStaffStatusByEmail({
			email: identifier,
			status: StaffStatus.LOCKED,
		});
	} catch (error) {
		// Log but don't fail - Redis lock is still in place for immediate blocking
		logger.error(
			{ identifier: `****${identifier.slice(-4)}`, error },
			"Failed to persist LOCKED status to database",
		);
	}

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
	const key = `${AUTH_CACHE_KEYS.ACCOUNT_LOCKED}${identifier}`;
	const result = await redis.get(key);
	return result !== null;
}

/**
 * Unlock an account
 * Clears Redis cache lock and resets status to ACTIVE in database
 */
export async function unlockAccount({
	identifier,
}: {
	identifier: string;
}): Promise<void> {
	const lockKey = `${AUTH_CACHE_KEYS.ACCOUNT_LOCKED}${identifier}`;
	const failedKey = `${AUTH_CACHE_KEYS.FAILED_LOGINS}${identifier}`;

	await redis.del(lockKey);
	await redis.del(failedKey);

	// Reset status to ACTIVE in database
	try {
		await updateStaffStatusByEmail({
			email: identifier,
			status: StaffStatus.ACTIVE,
		});
	} catch (error) {
		// Log but don't fail - Redis lock is already cleared
		logger.error(
			{ identifier: `****${identifier.slice(-4)}`, error },
			"Failed to reset status to ACTIVE in database",
		);
	}

	logger.info(
		{ identifier: `****${identifier.slice(-4)}` },
		"Account unlocked",
	);
}

/**
 * Create MFA challenge for two-step authentication flow
 *
 * Step 1 of MFA flow:
 * - User submits password successfully
 * - Challenge created with temporary token
 * - User receives token and must provide TOTP code
 *
 * @param params - Challenge parameters
 * @param params.challengeToken - Unique token identifying this challenge
 * @param params.userId - User ID attempting authentication
 * @param params.tenantId - Tenant ID for the user
 * @param params.expiresIn - TTL in seconds (default: 5 minutes)
 */
export async function createMfaChallenge({
	challengeToken,
	userId,
	tenantId,
	expiresIn = AUTH_CACHE_TTL.MFA_CHALLENGE,
}: {
	challengeToken: string;
	userId: string;
	tenantId: string;
	expiresIn?: number;
}): Promise<void> {
	const key = `${AUTH_CACHE_KEYS.MFA_CHALLENGE}${challengeToken}`;
	const data = JSON.stringify({
		userId,
		tenantId,
		createdAt: Date.now(),
	});

	await redis.setex(key, expiresIn, data);
	logger.debug({ userId }, "MFA challenge created");
}

/**
 * Get MFA challenge data
 *
 * Used in Step 2 of MFA flow to verify the challenge is valid
 * and retrieve associated user/tenant information.
 *
 * @param params - Retrieval parameters
 * @param params.challengeToken - Challenge token to look up
 * @returns Challenge data or null if not found/expired
 */
export async function getMfaChallenge({
	challengeToken,
}: {
	challengeToken: string;
}): Promise<{
	userId: string;
	tenantId: string;
} | null> {
	const key = `${AUTH_CACHE_KEYS.MFA_CHALLENGE}${challengeToken}`;
	const data = await redis.get(key);

	if (!data) {
		return null;
	}

	try {
		const parsed = JSON.parse(data) as {
			userId: string;
			tenantId: string;
			createdAt: number;
		};
		return {
			userId: parsed.userId,
			tenantId: parsed.tenantId,
		};
	} catch {
		return null;
	}
}

/**
 * Delete MFA challenge
 *
 * Called after successful MFA verification to prevent reuse.
 * Also called when challenge expires or is explicitly invalidated.
 *
 * @param params - Deletion parameters
 * @param params.challengeToken - Challenge token to delete
 */
export async function deleteMfaChallenge({
	challengeToken,
}: {
	challengeToken: string;
}): Promise<void> {
	const key = `${AUTH_CACHE_KEYS.MFA_CHALLENGE}${challengeToken}`;
	await redis.del(key);
	logger.debug("MFA challenge deleted");
}
