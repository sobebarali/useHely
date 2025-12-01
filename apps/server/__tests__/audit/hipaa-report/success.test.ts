import { AuditLog } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/reports/hipaa - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	const createdLogIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:REPORT"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;

		// Create test audit logs for the report
		const eventTypes = ["PHI_VIEW", "AUTH_LOGIN", "AUTH_FAILED"];
		for (let i = 0; i < 5; i++) {
			const logId = uuidv4();
			await AuditLog.create({
				_id: logId,
				tenantId: context.hospitalId,
				eventType: eventTypes[i % 3],
				category: i < 2 ? "PHI" : "AUTH",
				userId: context.userId,
				userName: "Test User",
				resourceType: i < 2 ? "patient" : undefined,
				resourceId: i < 2 ? uuidv4() : undefined,
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

	it("generates HIPAA compliance report", async () => {
		const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const endDate = new Date().toISOString();

		const response = await request(app)
			.get(`/api/audit/reports/hipaa?startDate=${startDate}&endDate=${endDate}`)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.reportId).toBeDefined();
		expect(response.body.data.period).toBeDefined();
		expect(response.body.data.summary).toBeDefined();
		expect(response.body.data.summary.totalEvents).toBeGreaterThanOrEqual(5);
		expect(response.body.data.phiAccessByUser).toBeInstanceOf(Array);
		expect(response.body.data.phiAccessByRole).toBeDefined();
		expect(typeof response.body.data.phiAccessByRole).toBe("object");
		expect(response.body.data.generatedAt).toBeDefined();
	});
});
