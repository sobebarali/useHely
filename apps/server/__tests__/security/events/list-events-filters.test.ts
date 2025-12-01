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

describe("GET /api/security/events - Filters", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const createdEventIds: string[] = [];
	let otherUserId: string;

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

		// Create another user ID for filtering tests
		otherUserId = uuidv4();

		// Create diverse test security events
		const testEvents = [
			{
				type: "AUTH_FAILED",
				severity: "medium",
				userId: context.userId,
			},
			{
				type: "AUTH_FAILED",
				severity: "high",
				userId: context.userId,
			},
			{
				type: "MFA_ENABLED",
				severity: "low",
				userId: context.userId,
			},
			{
				type: "PERMISSION_DENIED",
				severity: "medium",
				userId: otherUserId,
			},
			{
				type: "MFA_FAILED",
				severity: "high",
				userId: context.userId,
			},
			{
				type: "AUTH_LOCKOUT",
				severity: "critical",
				userId: context.userId,
			},
		];

		for (let i = 0; i < testEvents.length; i++) {
			const eventId = uuidv4();
			const eventData = testEvents[i]!;
			await SecurityEvent.create({
				_id: eventId,
				tenantId: context.hospitalId,
				type: eventData.type,
				severity: eventData.severity,
				userId: eventData.userId,
				ip: "192.168.1.1",
				userAgent: "test-agent",
				details: { index: i },
				timestamp: new Date(Date.now() - i * 60000),
			});
			createdEventIds.push(eventId);
		}
	}, 30000);

	afterAll(async () => {
		for (const id of createdEventIds) {
			await SecurityEvent.deleteOne({ _id: id });
		}
		await cleanupSecurityEvents(context.hospitalId);
		await context.cleanup();
	});

	it("should filter by severity (low)", async () => {
		const response = await request(app)
			.get("/api/security/events?severity=low")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const events = response.body.data.events;
		for (const event of events) {
			expect(event.severity).toBe("low");
		}
	});

	it("should filter by severity (high)", async () => {
		const response = await request(app)
			.get("/api/security/events?severity=high")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const events = response.body.data.events;
		for (const event of events) {
			expect(event.severity).toBe("high");
		}
	});

	it("should filter by severity (critical)", async () => {
		const response = await request(app)
			.get("/api/security/events?severity=critical")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const events = response.body.data.events;
		for (const event of events) {
			expect(event.severity).toBe("critical");
		}
	});

	it("should filter by type (AUTH_FAILED)", async () => {
		const response = await request(app)
			.get("/api/security/events?type=AUTH_FAILED")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const events = response.body.data.events;
		for (const event of events) {
			expect(event.type).toBe("AUTH_FAILED");
		}
	});

	it("should filter by type (MFA_ENABLED)", async () => {
		const response = await request(app)
			.get("/api/security/events?type=MFA_ENABLED")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const events = response.body.data.events;
		for (const event of events) {
			expect(event.type).toBe("MFA_ENABLED");
		}
	});

	it("should filter by userId", async () => {
		const response = await request(app)
			.get(`/api/security/events?userId=${context.userId}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const events = response.body.data.events;
		for (const event of events) {
			expect(event.userId).toBe(context.userId);
		}
	});

	it("should filter by date range (startDate)", async () => {
		const startDate = new Date(Date.now() - 2 * 60000).toISOString();

		const response = await request(app)
			.get(`/api/security/events?startDate=${startDate}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const events = response.body.data.events;
		const startDateTime = new Date(startDate).getTime();
		for (const event of events) {
			expect(new Date(event.timestamp).getTime()).toBeGreaterThanOrEqual(
				startDateTime,
			);
		}
	});

	it("should filter by date range (endDate)", async () => {
		const endDate = new Date(Date.now() - 3 * 60000).toISOString();

		const response = await request(app)
			.get(`/api/security/events?endDate=${endDate}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const events = response.body.data.events;
		const endDateTime = new Date(endDate).getTime();
		for (const event of events) {
			expect(new Date(event.timestamp).getTime()).toBeLessThanOrEqual(
				endDateTime,
			);
		}
	});

	it("should combine multiple filters", async () => {
		const response = await request(app)
			.get(
				`/api/security/events?type=AUTH_FAILED&severity=medium&userId=${context.userId}`,
			)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const events = response.body.data.events;
		for (const event of events) {
			expect(event.type).toBe("AUTH_FAILED");
			expect(event.severity).toBe("medium");
			expect(event.userId).toBe(context.userId);
		}
	});
});
