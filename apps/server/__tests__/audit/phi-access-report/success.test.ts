import { AuditLog } from "@hms/db";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/index";
import {
	type AuthTestContext,
	createAuthTestContext,
} from "../../helpers/auth-test-context";

describe("GET /api/audit/reports/phi-access - Success", () => {
	let context: AuthTestContext;
	let accessToken: string;
	let testPatientId: string;
	const createdLogIds: string[] = [];

	beforeAll(async () => {
		context = await createAuthTestContext({
			roleName: "HOSPITAL_ADMIN",
			rolePermissions: ["AUDIT:REPORT"],
		});

		const tokens = await context.issuePasswordTokens();
		accessToken = tokens.accessToken;
		testPatientId = uuidv4();

		// Create test PHI access logs
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
				resourceId: testPatientId,
				action: "READ",
				ip: "192.168.1.1",
				details: { fieldsAccessed: ["name", "diagnosis"] },
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

	it("generates PHI access report", async () => {
		const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const endDate = new Date().toISOString();

		const response = await request(app)
			.get(
				`/api/audit/reports/phi-access?startDate=${startDate}&endDate=${endDate}`,
			)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.period).toBeDefined();
		expect(response.body.data.logs).toBeInstanceOf(Array);
		expect(response.body.data.logs.length).toBeGreaterThanOrEqual(3);
		expect(response.body.data.pagination).toBeDefined();
	});

	it("filters by patient ID", async () => {
		const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const endDate = new Date().toISOString();

		const response = await request(app)
			.get(
				`/api/audit/reports/phi-access?startDate=${startDate}&endDate=${endDate}&patientId=${testPatientId}`,
			)
			.set("Authorization", `Bearer ${accessToken}`);

		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data.filters.patientId).toBe(testPatientId);

		// All returned logs should be for this patient
		for (const log of response.body.data.logs) {
			expect(log.patientId).toBe(testPatientId);
		}
	});
});
