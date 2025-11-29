import { Redis } from "@upstash/redis";

// Check if Redis is properly configured
const REDIS_URL = process.env.UPSTASH_REDIS_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_TOKEN;

const isRedisConfigured = Boolean(REDIS_URL && REDIS_TOKEN);

// Create a mock Redis client for when Redis is not configured
const mockRedis = {
	get: async () => null,
	set: async () => "OK",
	del: async () => 0,
	incr: async () => 1,
	expire: async () => 1,
	sadd: async () => 1,
	srem: async () => 1,
	smembers: async () => [],
} as unknown as Redis;

// Export real Redis client if configured, otherwise use mock
export const redis = isRedisConfigured
	? new Redis({
			url: REDIS_URL,
			token: REDIS_TOKEN,
		})
	: mockRedis;

export { isRedisConfigured };
