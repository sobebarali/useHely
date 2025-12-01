import { AuditLog } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/users/:userId/trail - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const createdLogIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create test audit logs for the user
		for (let i = 0; i < 3; i++) {
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
				hash: `test-hash-${i}`,
				previousHash: i === 0 ? "GENESIS" : `test-hash-${i - 1}`,
				timestamp: new Date(Date.now() - i * 60000),
			});
			createdLogIds.push(logId);
		}
	}, 30000);

	afterAll(async () => {
		for (const logId of createdLogIds) {
			await AuditLog.deleteOne({ _id: logId });
		}
		await context.cleanup();
	});

	it("returns user audit trail", async () => {
		const response = await request(app)
			.get(`/api/audit/users/${context.userId}/trail`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.userId).toBe(context.userId);
		expect(response.body.data.logs).toBeInstanceOf(Array);
		expect(response.body.data.logs.length).toBeGreaterThanOrEqual(3);
		expect(response.body.data.pagination).toBeDefined();
		expect(response.body.data.pagination.page).toBe(1);
	});

	it("supports pagination", async () => {
		const response = await request(app)
			.get(`/api/audit/users/${context.userId}/trail?page=1&limit=2`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.logs.length).toBeLessThanOrEqual(2);
		expect(response.body.data.pagination.page).toBe(1);
		expect(response.body.data.pagination.limit).toBe(2);
	});
});
