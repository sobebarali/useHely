import {
	HOSPITAL_CACHE_KEYS,
	HOSPITAL_CACHE_TTL,
} from "../../constants/cache.constants";
import { redis } from "../redis";

// Re-export for backward compatibility with tests
export const CacheKeys = {
	hospital: (id: string) => `${HOSPITAL_CACHE_KEYS.HOSPITAL}${id}`,
	verificationToken: (hospitalId: string) =>
		`${HOSPITAL_CACHE_KEYS.VERIFICATION_TOKEN}${hospitalId}`,
} as const;

/**
 * Get hospital data from cache
 */
export async function getCachedHospital(id: string): Promise<unknown | null> {
	try {
		const key = `${HOSPITAL_CACHE_KEYS.HOSPITAL}${id}`;
		const cached = await redis.get(key);
		if (!cached) return null;
		return JSON.parse(cached);
	} catch (error) {
		console.error("Redis get error:", error);
		return null; // Fail silently, fall back to database
	}
}

/**
 * Set hospital data in cache
 */
export async function setCachedHospital(
	id: string,
	data: unknown,
): Promise<void> {
	try {
		const key = `${HOSPITAL_CACHE_KEYS.HOSPITAL}${id}`;
		await redis.setex(
			key,
			HOSPITAL_CACHE_TTL.HOSPITAL_DATA,
			JSON.stringify(data),
		);
	} catch (error) {
		console.error("Redis set error:", error);
		// Fail silently, don't block the operation
	}
}

/**
 * Invalidate hospital cache
 */
export async function invalidateHospitalCache(id: string): Promise<void> {
	try {
		const key = `${HOSPITAL_CACHE_KEYS.HOSPITAL}${id}`;
		await redis.del(key);
	} catch (error) {
		console.error("Redis delete error:", error);
		// Fail silently
	}
}

/**
 * Store verification token in Redis with TTL
 */
export async function setVerificationToken(
	hospitalId: string,
	token: string,
	expiresInSeconds?: number,
): Promise<void> {
	try {
		const key = `${HOSPITAL_CACHE_KEYS.VERIFICATION_TOKEN}${hospitalId}`;
		const ttl = expiresInSeconds || HOSPITAL_CACHE_TTL.VERIFICATION_TOKEN;
		await redis.setex(key, ttl, token);
	} catch (error) {
		console.error("Redis set verification token error:", error);
		// Don't throw - verification token is also stored in database
	}
}

/**
 * Get verification token from Redis
 */
export async function getVerificationToken(
	hospitalId: string,
): Promise<string | null> {
	try {
		const key = `${HOSPITAL_CACHE_KEYS.VERIFICATION_TOKEN}${hospitalId}`;
		const token = await redis.get(key);
		return token;
	} catch (error) {
		console.error("Redis get verification token error:", error);
		return null; // Fall back to database
	}
}

/**
 * Delete verification token from Redis
 */
export async function deleteVerificationToken(
	hospitalId: string,
): Promise<void> {
	try {
		const key = `${HOSPITAL_CACHE_KEYS.VERIFICATION_TOKEN}${hospitalId}`;
		await redis.del(key);
	} catch (error) {
		console.error("Redis delete verification token error:", error);
		// Fail silently
	}
}
