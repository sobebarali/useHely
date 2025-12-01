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

describe("GET /api/security/events - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const createdEventIds: string[] = [];

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

		// Create some test security events
		for (let i = 0; i < 5; i++) {
			const eventId = uuidv4();
			await SecurityEvent.create({
				_id: eventId,
				tenantId: context.hospitalId,
				type: "AUTH_FAILED",
				severity: "medium",
				userId: context.userId,
				ip: "192.168.1.1",
				userAgent: "test-agent",
				details: { attempt: i + 1 },
				timestamp: new Date(Date.now() - i * 60000), // Stagger timestamps
			});
			createdEventIds.push(eventId);
		}
	}, 30000);

	afterAll(async () => {
		// Clean up created events
		for (const id of createdEventIds) {
			await SecurityEvent.deleteOne({ _id: id });
		}
		await cleanupSecurityEvents(context.hospitalId);
		await context.cleanup();
	});

	it("should return paginated security events", async () => {
		const response = await request(app)
			.get("/api/security/events")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toHaveProperty("events");
		expect(response.body.data).toHaveProperty("pagination");

		expect(Array.isArray(response.body.data.events)).toBe(true);
	});

	it("should return events sorted by timestamp DESC (most recent first)", async () => {
		const response = await request(app)
			.get("/api/security/events")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const events = response.body.data.events;
		if (events.length > 1) {
			for (let i = 1; i < events.length; i++) {
				const prevDate = new Date(events[i - 1].timestamp);
				const currDate = new Date(events[i].timestamp);
				expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
			}
		}
	});

	it("should include pagination metadata", async () => {
		const response = await request(app)
			.get("/api/security/events")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const pagination = response.body.data.pagination;
		expect(pagination).toHaveProperty("page");
		expect(pagination).toHaveProperty("limit");
		expect(pagination).toHaveProperty("total");
		expect(pagination).toHaveProperty("pages");

		expect(typeof pagination.page).toBe("number");
		expect(typeof pagination.limit).toBe("number");
		expect(typeof pagination.total).toBe("number");
		expect(typeof pagination.pages).toBe("number");
	});

	it("should return all event fields", async () => {
		const response = await request(app)
			.get("/api/security/events")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const events = response.body.data.events;
		if (events.length > 0) {
			const event = events[0];
			expect(event).toHaveProperty("id");
			expect(event).toHaveProperty("type");
			expect(event).toHaveProperty("severity");
			expect(event).toHaveProperty("timestamp");
		}
	});

	it("should use default limit of 20", async () => {
		const response = await request(app)
			.get("/api/security/events")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.pagination.limit).toBe(20);
	});

	it("should use default page of 1", async () => {
		const response = await request(app)
			.get("/api/security/events")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.pagination.page).toBe(1);
	});

	it("should require authentication", async () => {
		const response = await request(app).get("/api/security/events");

		expect(response.status).toBe(401);
	});
});
