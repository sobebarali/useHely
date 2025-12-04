import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { AUTH_CACHE_KEYS } from "../../../src/constants/cache.constants";
import {
	createMfaChallenge,
	deleteMfaChallenge,
	getMfaChallenge,
} from "../../../src/lib/cache/auth.cache";
import { redis } from "../../../src/lib/redis";

describe("MFA Challenge Cache Functions", () => {
	// Cleanup function to remove test data
	const cleanupKeys: string[] = [];

	afterAll(async () => {
		// Clean up all test keys
		if (cleanupKeys.length > 0) {
			await redis.del(...cleanupKeys);
		}
	});

	describe("createMfaChallenge", () => {
		it("should create an MFA challenge in cache", async () => {
			const challengeToken = randomBytes(16).toString("hex");
			const userId = `user_${Date.now()}`;
			const tenantId = `tenant_${Date.now()}`;

			cleanupKeys.push(`${AUTH_CACHE_KEYS.MFA_CHALLENGE}${challengeToken}`);

			await createMfaChallenge({
				challengeToken,
				userId,
				tenantId,
			});

			// Verify the challenge exists in Redis
			const key = `${AUTH_CACHE_KEYS.MFA_CHALLENGE}${challengeToken}`;
			const rawData = await redis.get(key);

			expect(rawData).not.toBeNull();

			if (rawData) {
				const data = JSON.parse(rawData) as {
					userId: string;
					tenantId: string;
					createdAt: number;
				};
				expect(data.userId).toBe(userId);
				expect(data.tenantId).toBe(tenantId);
				expect(data.createdAt).toBeDefined();
			}
		});

		it("should set TTL on MFA challenge", async () => {
			const challengeToken = randomBytes(16).toString("hex");
			const userId = `user_${Date.now()}`;
			const tenantId = `tenant_${Date.now()}`;

			cleanupKeys.push(`${AUTH_CACHE_KEYS.MFA_CHALLENGE}${challengeToken}`);

			await createMfaChallenge({
				challengeToken,
				userId,
				tenantId,
				expiresIn: 300, // 5 minutes
			});

			const key = `${AUTH_CACHE_KEYS.MFA_CHALLENGE}${challengeToken}`;
			const ttl = await redis.ttl(key);

			// TTL should be set and close to 300 seconds
			expect(ttl).toBeGreaterThan(0);
			expect(ttl).toBeLessThanOrEqual(300);
		});

		it("should use default TTL if not specified", async () => {
			const challengeToken = randomBytes(16).toString("hex");
			const userId = `user_${Date.now()}`;
			const tenantId = `tenant_${Date.now()}`;

			cleanupKeys.push(`${AUTH_CACHE_KEYS.MFA_CHALLENGE}${challengeToken}`);

			await createMfaChallenge({
				challengeToken,
				userId,
				tenantId,
			});

			const key = `${AUTH_CACHE_KEYS.MFA_CHALLENGE}${challengeToken}`;
			const ttl = await redis.ttl(key);

			// Default TTL is 300 seconds (5 minutes)
			expect(ttl).toBeGreaterThan(0);
			expect(ttl).toBeLessThanOrEqual(300);
		});
	});

	describe("getMfaChallenge", () => {
		it("should retrieve an existing MFA challenge", async () => {
			const challengeToken = randomBytes(16).toString("hex");
			const userId = `user_${Date.now()}`;
			const tenantId = `tenant_${Date.now()}`;

			cleanupKeys.push(`${AUTH_CACHE_KEYS.MFA_CHALLENGE}${challengeToken}`);

			// Create challenge first
			await createMfaChallenge({
				challengeToken,
				userId,
				tenantId,
			});

			// Retrieve challenge
			const challenge = await getMfaChallenge({ challengeToken });

			expect(challenge).not.toBeNull();
			expect(challenge?.userId).toBe(userId);
			expect(challenge?.tenantId).toBe(tenantId);
		});

		it("should return null for non-existent challenge", async () => {
			const nonExistentToken = randomBytes(16).toString("hex");

			const challenge = await getMfaChallenge({
				challengeToken: nonExistentToken,
			});

			expect(challenge).toBeNull();
		});

		it("should return null for expired challenge", async () => {
			const challengeToken = randomBytes(16).toString("hex");
			const userId = `user_${Date.now()}`;
			const tenantId = `tenant_${Date.now()}`;

			cleanupKeys.push(`${AUTH_CACHE_KEYS.MFA_CHALLENGE}${challengeToken}`);

			// Create challenge with very short TTL (1 second)
			await createMfaChallenge({
				challengeToken,
				userId,
				tenantId,
				expiresIn: 1,
			});

			// Wait for expiration
			await new Promise((resolve) => setTimeout(resolve, 1100));

			// Challenge should be expired
			const challenge = await getMfaChallenge({ challengeToken });
			expect(challenge).toBeNull();
		});
	});

	describe("deleteMfaChallenge", () => {
		it("should delete an existing MFA challenge", async () => {
			const challengeToken = randomBytes(16).toString("hex");
			const userId = `user_${Date.now()}`;
			const tenantId = `tenant_${Date.now()}`;

			cleanupKeys.push(`${AUTH_CACHE_KEYS.MFA_CHALLENGE}${challengeToken}`);

			// Create challenge
			await createMfaChallenge({
				challengeToken,
				userId,
				tenantId,
			});

			// Verify it exists
			let challenge = await getMfaChallenge({ challengeToken });
			expect(challenge).not.toBeNull();

			// Delete challenge
			await deleteMfaChallenge({ challengeToken });

			// Verify it's deleted
			challenge = await getMfaChallenge({ challengeToken });
			expect(challenge).toBeNull();
		});

		it("should handle deleting non-existent challenge gracefully", async () => {
			const nonExistentToken = randomBytes(16).toString("hex");

			// Should not throw error
			await expect(
				deleteMfaChallenge({ challengeToken: nonExistentToken }),
			).resolves.not.toThrow();
		});
	});

	describe("MFA Challenge Flow Integration", () => {
		it("should support complete create-retrieve-delete flow", async () => {
			const challengeToken = randomBytes(16).toString("hex");
			const userId = `user_${Date.now()}`;
			const tenantId = `tenant_${Date.now()}`;

			cleanupKeys.push(`${AUTH_CACHE_KEYS.MFA_CHALLENGE}${challengeToken}`);

			// Step 1: Create challenge (after password verification)
			await createMfaChallenge({
				challengeToken,
				userId,
				tenantId,
			});

			// Step 2: Retrieve challenge (during TOTP verification)
			const challenge = await getMfaChallenge({ challengeToken });
			expect(challenge).not.toBeNull();
			expect(challenge?.userId).toBe(userId);
			expect(challenge?.tenantId).toBe(tenantId);

			// Step 3: Delete challenge (after successful MFA verification)
			await deleteMfaChallenge({ challengeToken });

			// Step 4: Verify challenge can't be reused
			const deletedChallenge = await getMfaChallenge({ challengeToken });
			expect(deletedChallenge).toBeNull();
		});
	});
});
