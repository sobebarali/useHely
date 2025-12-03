import { Hospital } from "@hms/db";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	CacheKeys,
	getCachedHospital,
	invalidateHospitalCache,
} from "../../../src/lib/cache/hospital.cache";
import { redis } from "../../../src/lib/redis";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/hospitals/:id - Redis caching functionality", () => {
	let authContext: AuthTestContext;
	let accessToken: string;

	beforeAll(async () => {
		// Create auth context with TENANT:READ, TENANT:UPDATE, and TENANT:MANAGE permissions
		authContext = await createAuthTestContext({
			roleName: "SUPER_ADMIN",
			rolePermissions: ["TENANT:READ", "TENANT:UPDATE", "TENANT:MANAGE"],
		});

		// Get access token
		const tokens = await authContext.issuePasswordTokens();
		accessToken = tokens.accessToken;
	});

	afterAll(async () => {
		await invalidateHospitalCache(authContext.hospitalId);
		await authContext.cleanup();
	});

	it("should cache hospital data on first GET request", async () => {
		// Clear cache first
		await invalidateHospitalCache(authContext.hospitalId);

		// Verify cache is empty
		const cachedBefore = await getCachedHospital(authContext.hospitalId);
		expect(cachedBefore).toBeNull();

		// Make GET request - should populate cache
		const response = await request(app)
			.get(`/api/hospitals/${authContext.hospitalId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		// Verify cache is now populated
		const cachedAfter = await getCachedHospital(authContext.hospitalId);
		expect(cachedAfter).not.toBeNull();
		expect(cachedAfter).toHaveProperty("id");
	});

	it("should serve hospital data from cache on subsequent requests", async () => {
		// Make first request to populate cache
		await request(app)
			.get(`/api/hospitals/${authContext.hospitalId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		// Verify data is in cache
		const cached = await getCachedHospital(authContext.hospitalId);
		expect(cached).not.toBeNull();

		// Second request should use cache
		const response = await request(app)
			.get(`/api/hospitals/${authContext.hospitalId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("success", true);
		expect(response.body).toHaveProperty("data");
		expect(response.body.data.id).toBe(authContext.hospitalId);
	});

	it("should invalidate cache when hospital is updated", async () => {
		// Ensure cache is populated
		await request(app)
			.get(`/api/hospitals/${authContext.hospitalId}`)
			.set("Authorization", `Bearer ${accessToken}`);
		let cached = await getCachedHospital(authContext.hospitalId);
		expect(cached).not.toBeNull();

		// Update hospital
		const updateData = {
			contactPhone: "+9876543210",
		};

		const updateResponse = await request(app)
			.patch(`/api/hospitals/${authContext.hospitalId}`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(updateData);

		expect(updateResponse.status).toBe(200);

		// Cache should be invalidated (empty)
		cached = await getCachedHospital(authContext.hospitalId);
		expect(cached).toBeNull();
	});

	it("should invalidate cache when hospital status is updated", async () => {
		// Verify hospital first to enable status transitions
		const hospital = await Hospital.findById(authContext.hospitalId);
		if (hospital && hospital.status !== "VERIFIED") {
			await Hospital.findByIdAndUpdate(authContext.hospitalId, {
				status: "VERIFIED",
			});
		}

		// Populate cache
		await request(app)
			.get(`/api/hospitals/${authContext.hospitalId}`)
			.set("Authorization", `Bearer ${accessToken}`);
		let cached = await getCachedHospital(authContext.hospitalId);
		expect(cached).not.toBeNull();

		// Update status
		const statusUpdate = {
			status: "ACTIVE",
		};

		const updateResponse = await request(app)
			.patch(`/api/hospitals/${authContext.hospitalId}/status`)
			.set("Authorization", `Bearer ${accessToken}`)
			.send(statusUpdate);

		expect(updateResponse.status).toBe(200);

		// Cache should be invalidated
		cached = await getCachedHospital(authContext.hospitalId);
		expect(cached).toBeNull();
	});

	it("should have TTL set on cached hospital data", async () => {
		// Clear cache
		await invalidateHospitalCache(authContext.hospitalId);

		// Populate cache
		await request(app)
			.get(`/api/hospitals/${authContext.hospitalId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		// Check TTL
		const key = CacheKeys.hospital(authContext.hospitalId);
		const ttl = await redis.ttl(key);

		// TTL should be set (greater than 0) and less than or equal to 1 hour (3600 seconds)
		expect(ttl).toBeGreaterThan(0);
		expect(ttl).toBeLessThanOrEqual(3600);
	});
});
