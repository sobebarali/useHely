import { AuditLog } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/resources/:resourceType/:resourceId/trail - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let testPatientId: string;
	const createdLogIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:READ"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
		testPatientId = uuidv4();

		// Create test audit logs for the resource
		for (let i = 0; i < 3; i++) {
			const logId = uuidv4();
			await AuditLog.create({
				_id: logId,
				tenantId: context.hospitalId,
				eventType: i === 0 ? "PHI_CREATE" : "PHI_VIEW",
				category: "PHI",
				userId: context.userId,
				userName: "Test User",
				resourceType: "patient",
				resourceId: testPatientId,
				action: i === 0 ? "CREATE" : "READ",
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

	it("returns resource audit trail", async () => {
		const response = await request(app)
			.get(`/api/audit/resources/patient/${testPatientId}/trail`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.resourceType).toBe("patient");
		expect(response.body.data.resourceId).toBe(testPatientId);
		expect(response.body.data.logs).toBeInstanceOf(Array);
		expect(response.body.data.logs.length).toBe(3);
		expect(response.body.data.pagination).toBeDefined();
	});

	it("supports pagination", async () => {
		const response = await request(app)
			.get(`/api/audit/resources/patient/${testPatientId}/trail?page=1&limit=2`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.logs.length).toBeLessThanOrEqual(2);
		expect(response.body.data.pagination.page).toBe(1);
		expect(response.body.data.pagination.limit).toBe(2);
	});
});
