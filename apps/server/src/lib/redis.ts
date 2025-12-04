/**
 * Redis Connection Module
 *
 * Provides Redis client using ioredis for:
 * - Session caching
 * - Hospital data caching
 * - BullMQ job queues
 * - Rate limiting
 * - Distributed locks
 */

import Redis from "ioredis";
import { createUtilLogger } from "./logger";

const logger = createUtilLogger("redis");

// Redis configuration from environment variables
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT
	? Number(process.env.REDIS_PORT)
	: 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_USERNAME = process.env.REDIS_USERNAME || "default";

// Check if Redis is properly configured
const isRedisConfigured = Boolean(REDIS_HOST && REDIS_PASSWORD);

// Mock Redis client for when Redis is not configured (development/testing without Redis)
const createMockRedis = () => {
	const store = new Map<string, string>();
	const sets = new Map<string, Set<string>>();

	return {
		get: async (key: string) => store.get(key) ?? null,
		set: async (key: string, value: string, ..._args: unknown[]) => {
			store.set(key, value);
			return "OK";
		},
		setex: async (key: string, seconds: number, value: string) => {
			store.set(key, value);
			// Auto-delete after TTL (simplified for mock)
			setTimeout(() => store.delete(key), seconds * 1000);
			return "OK";
		},
		del: async (...keys: string[]) => {
			let count = 0;
			for (const key of keys) {
				if (store.delete(key)) count++;
				if (sets.delete(key)) count++;
			}
			return count;
		},
		incr: async (key: string) => {
			const current = Number.parseInt(store.get(key) || "0", 10);
			const next = current + 1;
			store.set(key, String(next));
			return next;
		},
		expire: async (_key: string, _seconds: number) => 1,
		sadd: async (key: string, ...members: string[]) => {
			if (!sets.has(key)) sets.set(key, new Set());
			const set = sets.get(key) as Set<string>;
			let added = 0;
			for (const member of members) {
				if (!set.has(member)) {
					set.add(member);
					added++;
				}
			}
			return added;
		},
		srem: async (key: string, ...members: string[]) => {
			const set = sets.get(key);
			if (!set) return 0;
			let removed = 0;
			for (const member of members) {
				if (set.delete(member)) removed++;
			}
			return removed;
		},
		smembers: async (key: string) => {
			const set = sets.get(key);
			return set ? Array.from(set) : [];
		},
		ping: async () => "PONG",
		quit: async () => "OK",
		duplicate: () => createMockRedis(),
	} as unknown as Redis;
};

// Create Redis client
let redis: Redis;

if (isRedisConfigured) {
	redis = new Redis({
		host: REDIS_HOST,
		port: REDIS_PORT,
		username: REDIS_USERNAME,
		password: REDIS_PASSWORD,
		maxRetriesPerRequest: null, // Required for BullMQ
		enableReadyCheck: false,
		retryStrategy: (times: number) => {
			if (times > 3) {
				logger.error({ times }, "Redis connection failed after retries");
				return null; // Stop retrying
			}
			return Math.min(times * 200, 2000); // Exponential backoff
		},
	});

	redis.on("error", (error) => {
		logger.error({ error }, "Redis client error");
	});

	redis.on("connect", () => {
		logger.info("Redis client connected");
	});

	redis.on("ready", () => {
		logger.info("Redis client ready");
	});

	redis.on("close", () => {
		logger.warn("Redis client connection closed");
	});
} else {
	logger.warn(
		"Redis not configured (REDIS_HOST/REDIS_PASSWORD missing). Using in-memory mock for development.",
	);
	redis = createMockRedis();
}

/**
 * Create a duplicate Redis connection for BullMQ workers
 * BullMQ requires separate connections for queue and worker
 */
export function createRedisConnection(): Redis {
	if (!isRedisConfigured) {
		return createMockRedis();
	}

	return new Redis({
		host: REDIS_HOST,
		port: REDIS_PORT,
		username: REDIS_USERNAME,
		password: REDIS_PASSWORD,
		maxRetriesPerRequest: null,
		enableReadyCheck: false,
	});
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
	if (isRedisConfigured && redis) {
		await redis.quit();
		logger.info("Redis connection closed");
	}
}

export { redis, isRedisConfigured };
