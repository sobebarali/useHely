import { KeyRotation } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/security/keys/status - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let createdRotationIds: string[] = [];

	beforeAll(async () => {
		// Create test context with SECURITY:READ permission
		context = await createAuthTestContext({
			roleName: "SECURITY_ADMIN",
			rolePermissions: ["SECURITY:READ", "SECURITY:MANAGE"],
			createStaff: true,
		});

		// Get access token
		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
	}, 30000);

	afterAll(async () => {
		// Clean up any created rotation records
		for (const rotationId of createdRotationIds) {
			await KeyRotation.deleteOne({ _id: rotationId });
		}

		await context.cleanup();
	});

	it("should return current key ID", async () => {
		const response = await request(app)
			.get("/api/security/keys/status")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toHaveProperty("currentKeyId");

		// Current key ID should be first 8 chars of master key
		const currentKeyId = response.body.data.currentKeyId;
		expect(typeof currentKeyId).toBe("string");
		expect(currentKeyId.length).toBe(8);
	});

	it("should return last rotation details when rotation exists", async () => {
		// Create a test rotation record
		const rotationId = uuidv4();
		const rotatedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

		await KeyRotation.create({
			_id: rotationId,
			keyId: "test1234",
			rotatedAt,
			rotatedBy: context.userId,
			recordsReEncrypted: 100,
		});
		createdRotationIds.push(rotationId);

		const response = await request(app)
			.get("/api/security/keys/status")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveProperty("lastRotation");

		const lastRotation = response.body.data.lastRotation;
		expect(lastRotation).not.toBeNull();
		expect(lastRotation).toHaveProperty("rotatedAt");
		expect(lastRotation).toHaveProperty("rotatedBy");
		expect(lastRotation).toHaveProperty("recordsReEncrypted");
		expect(lastRotation).toHaveProperty("daysSinceRotation");
	});

	it("should calculate days since rotation correctly", async () => {
		// Create a rotation record from 45 days ago
		const rotationId = uuidv4();
		const daysAgo = 45;
		const rotatedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

		await KeyRotation.create({
			_id: rotationId,
			keyId: "test4567",
			rotatedAt,
			rotatedBy: context.userId,
			recordsReEncrypted: 50,
		});
		createdRotationIds.push(rotationId);

		const response = await request(app)
			.get("/api/security/keys/status")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const lastRotation = response.body.data.lastRotation;
		expect(lastRotation.daysSinceRotation).toBeGreaterThanOrEqual(daysAgo - 1);
		expect(lastRotation.daysSinceRotation).toBeLessThanOrEqual(daysAgo + 1);
	});

	it("should recommend rotation if more than 90 days since last rotation", async () => {
		// Create a rotation record from 100 days ago
		const rotationId = uuidv4();
		const rotatedAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);

		await KeyRotation.create({
			_id: rotationId,
			keyId: "old12345",
			rotatedAt,
			rotatedBy: context.userId,
			recordsReEncrypted: 75,
		});
		createdRotationIds.push(rotationId);

		const response = await request(app)
			.get("/api/security/keys/status")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveProperty("rotationRecommended");
		expect(response.body.data.rotationRecommended).toBe(true);
	});

	it("should return total rotations count", async () => {
		const response = await request(app)
			.get("/api/security/keys/status")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data).toHaveProperty("totalRotations");
		expect(typeof response.body.data.totalRotations).toBe("number");
		expect(response.body.data.totalRotations).toBeGreaterThanOrEqual(0);
	});

	it("should handle no previous rotations (null lastRotation)", async () => {
		// Clean up all rotation records for a clean test
		for (const rotationId of createdRotationIds) {
			await KeyRotation.deleteOne({ _id: rotationId });
		}
		createdRotationIds = [];

		// Delete all existing key rotations
		await KeyRotation.deleteMany({});

		const response = await request(app)
			.get("/api/security/keys/status")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.lastRotation).toBeNull();
		expect(response.body.data.totalRotations).toBe(0);
		// Should recommend rotation when never rotated
		expect(response.body.data.rotationRecommended).toBe(true);
	});

	it("should require authentication", async () => {
		const response = await request(app).get("/api/security/keys/status");

		expect(response.status).toBe(401);
	});
});
