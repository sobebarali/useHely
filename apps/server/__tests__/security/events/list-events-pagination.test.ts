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

describe("GET /api/security/events - Pagination", () => {
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

		// Create 25 test security events for pagination testing
		for (let i = 0; i < 25; i++) {
			const eventId = uuidv4();
			await SecurityEvent.create({
				_id: eventId,
				tenantId: context.hospitalId,
				type: "AUTH_FAILED",
				severity: "medium",
				userId: context.userId,
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

	it("should use default limit of 20", async () => {
		const response = await request(app)
			.get("/api/security/events")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.pagination.limit).toBe(20);
		expect(response.body.data.events.length).toBeLessThanOrEqual(20);
	});

	it("should respect custom limit", async () => {
		const response = await request(app)
			.get("/api/security/events?limit=5")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.pagination.limit).toBe(5);
		expect(response.body.data.events.length).toBeLessThanOrEqual(5);
	});

	it("should enforce max limit of 100", async () => {
		const response = await request(app)
			.get("/api/security/events?limit=200")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.pagination.limit).toBe(100);
	});

	it("should navigate to page 1", async () => {
		const response = await request(app)
			.get("/api/security/events?page=1&limit=10")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.pagination.page).toBe(1);
	});

	it("should navigate to page 2", async () => {
		const response = await request(app)
			.get("/api/security/events?page=2&limit=10")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.pagination.page).toBe(2);
	});

	it("should navigate to page 3", async () => {
		const response = await request(app)
			.get("/api/security/events?page=3&limit=10")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.pagination.page).toBe(3);
	});

	it("should return correct total count", async () => {
		const response = await request(app)
			.get("/api/security/events?limit=5")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(25);
	});

	it("should calculate pages correctly", async () => {
		const response = await request(app)
			.get("/api/security/events?limit=10")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		const { total, limit, pages } = response.body.data.pagination;
		const expectedPages = Math.ceil(total / limit);
		expect(pages).toBe(expectedPages);
	});

	it("should return different events on different pages", async () => {
		const page1Response = await request(app)
			.get("/api/security/events?page=1&limit=10")
			.set("Authorization", `Bearer ${accessToken}`);

		const page2Response = await request(app)
			.get("/api/security/events?page=2&limit=10")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(page1Response.status).toBe(200);
		expect(page2Response.status).toBe(200);

		const page1Ids = page1Response.body.data.events.map(
			(e: { id: string }) => e.id,
		);
		const page2Ids = page2Response.body.data.events.map(
			(e: { id: string }) => e.id,
		);

		// No overlap between pages
		const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
		expect(overlap.length).toBe(0);
	});

	it("should return empty array for page beyond total", async () => {
		const response = await request(app)
			.get("/api/security/events?page=100&limit=10")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.data.events).toHaveLength(0);
	});
});
