import { SecurityEvent } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";
import { cleanupSecurityEvents } from "../../helpers/security-test-helper";

describe("GET /api/security/events/:id - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let testEventId: string;

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

		// Create a test security event
		testEventId = uuidv4();
		await SecurityEvent.create({
			_id: testEventId,
			tenantId: context.hospitalId,
			type: "AUTH_FAILED",
			severity: "high",
			userId: context.userId,
			ip: "192.168.1.100",
			userAgent: "Mozilla/5.0 Test Browser",
			details: {
				reason: "Invalid password",
				attempts: 3,
			},
			timestamp: new Date(),
		});
	}, 30000);

	afterAll(async () => {
		await SecurityEvent.deleteOne({ _id: testEventId });
		await cleanupSecurityEvents(context.hospitalId);
		await context.cleanup();
	});

	it("should return single event by ID", async () => {
		const response = await request(app)
			.get(`/api/security/events/${testEventId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toHaveProperty("id");
		expect(response.body.data.id).toBe(testEventId);
	});

	it("should include all event details", async () => {
		const response = await request(app)
			.get(`/api/security/events/${testEventId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const event = response.body.data;
		expect(event).toHaveProperty("id");
		expect(event).toHaveProperty("type");
		expect(event).toHaveProperty("severity");
		expect(event).toHaveProperty("tenantId");
		expect(event).toHaveProperty("userId");
		expect(event).toHaveProperty("timestamp");
	});

	it("should include IP address", async () => {
		const response = await request(app)
			.get(`/api/security/events/${testEventId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.ip).toBe("192.168.1.100");
	});

	it("should include user agent", async () => {
		const response = await request(app)
			.get(`/api/security/events/${testEventId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.userAgent).toBe("Mozilla/5.0 Test Browser");
	});

	it("should include event details object", async () => {
		const response = await request(app)
			.get(`/api/security/events/${testEventId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.details).toHaveProperty(
			"reason",
			"Invalid password",
		);
		expect(response.body.data.details).toHaveProperty("attempts", 3);
	});

	it("should return correct event type", async () => {
		const response = await request(app)
			.get(`/api/security/events/${testEventId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.type).toBe("AUTH_FAILED");
	});

	it("should return correct severity", async () => {
		const response = await request(app)
			.get(`/api/security/events/${testEventId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.severity).toBe("high");
	});

	it("should return timestamp in ISO 8601 format", async () => {
		const response = await request(app)
			.get(`/api/security/events/${testEventId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		// Verify it's a valid ISO timestamp
		const timestamp = new Date(response.body.data.timestamp);
		expect(timestamp.getTime()).not.toBeNaN();
	});

	it("should require authentication", async () => {
		const response = await request(app).get(
			`/api/security/events/${testEventId}`,
		);

		expect(response.status).toBe(401);
	});
});
