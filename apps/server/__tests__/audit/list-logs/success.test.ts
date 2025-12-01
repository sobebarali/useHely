import { AuditLog } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/logs - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const createdLogIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:READ", "AUDIT:REPORT", "AUDIT:EXPORT"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create some test audit logs
		for (let i = 0; i < 5; i++) {
			const logId = uuidv4();
			await AuditLog.create({
				_id: logId,
				tenantId: context.hospitalId,
				eventType: "PHI_VIEW",
				category: "PHI",
				userId: context.userId,
				userName: "Test User",
				resourceType: "patient",
				resourceId: uuidv4(),
				action: "READ",
				ip: "192.168.1.1",
				userAgent: "Test Agent",
				hash: `test-hash-${i}`,
				previousHash: i === 0 ? "GENESIS" : `test-hash-${i - 1}`,
				timestamp: new Date(Date.now() - i * 60000), // Spaced 1 minute apart
			});
			createdLogIds.push(logId);
		}
	}, 30000);

	afterAll(async () => {
		// Clean up test audit logs
		for (const logId of createdLogIds) {
			await AuditLog.deleteOne({ _id: logId });
		}
		await context.cleanup();
	});

	it("returns paginated audit logs", async () => {
		const response = await request(app)
			.get("/api/audit/logs")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data).toBeDefined();
		expect(response.body.data).toBeInstanceOf(Array);
		expect(response.body.pagination).toBeDefined();
		expect(response.body.pagination.page).toBe(1);
		expect(response.body.pagination.limit).toBe(50);
		expect(response.body.pagination.total).toBeGreaterThanOrEqual(5);
	});

	it("filters by category", async () => {
		const response = await request(app)
			.get("/api/audit/logs?category=PHI")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);

		// All returned logs should have PHI category
		for (const log of response.body.data) {
			expect(log.category).toBe("PHI");
		}
	});

	it("filters by eventType", async () => {
		const response = await request(app)
			.get("/api/audit/logs?eventType=PHI_VIEW")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);

		// All returned logs should have PHI_VIEW event type
		for (const log of response.body.data) {
			expect(log.eventType).toBe("PHI_VIEW");
		}
	});

	it("supports pagination with page and limit", async () => {
		const response = await request(app)
			.get("/api/audit/logs?page=1&limit=2")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.length).toBeLessThanOrEqual(2);
		expect(response.body.pagination.page).toBe(1);
		expect(response.body.pagination.limit).toBe(2);
	});

	it("returns logs in descending order by timestamp", async () => {
		const response = await request(app)
			.get("/api/audit/logs")
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);

		// Verify logs are sorted by timestamp descending
		const logs = response.body.data;
		for (let i = 1; i < logs.length; i++) {
			const prevTimestamp = new Date(logs[i - 1].timestamp).getTime();
			const currTimestamp = new Date(logs[i].timestamp).getTime();
			expect(prevTimestamp).toBeGreaterThanOrEqual(currTimestamp);
		}
	});
});
